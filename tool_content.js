var RMB_TARGET = null;
var MANGA_TRACKER_URL = "http://localhost:8000/add_page";

document.addEventListener('contextmenu', function (event) {
  RMB_TARGET = event.target;
});

const tool = {
	markedElement: false,
	clickedElement: false,
	selectedElement: false,
	transpose: 0, // how far to travel up the line of ancestors
	selectedElements: [],
	
	helpWindow: false,
	
	triggerResize: function() {
		let evt = document.createEvent('UIEvents');
		window.dispatchEvent(evt);
	},

	highlightSelected: function() {
		if (!tool.clickedElement) return;
		
		if (tool.markedElement && (tool.markedElement != tool.clickedElement)) {
			tool.removeHighlightStyle(tool.markedElement);
		}

		tool.markedElement = tool.clickedElement;
		let i = 0;
		for (i = 0; i < tool.transpose; i++) {
			if (tool.markedElement.parentNode != window.document) {
				tool.markedElement = tool.markedElement.parentNode;
			} else {
				break;
			}
		}
		
		tool.transpose = i;
		tool.selectedElement = tool.markedElement
		tool.addHighlightStyle(tool.selectedElement);

		document.querySelector('#tool_selected_elm').innerHTML = tool.getPathHTML(tool.markedElement, tool.transpose);
		document.querySelector('#tool_selected_elm').scrollTop = 9999;
	},


	addHighlightStyle: function (elm) {
		if (tool.selectedElement) {
			tool.selectedElement.style.outline = 'solid 5px rgba(230,126,34,0.5)';
			tool.selectedElement.style.outlineOffset = '-5px';			
			return;}
		tool.markedElement.style.outline = 'solid 5px rgba(230,126,34,0.5)';
		tool.markedElement.style.outlineOffset = '-5px';
	},

	removeHighlightStyle: function (elm) {
		elm.style.outline = '';
		elm.style.outlineOffset = '';
	},
	
	keyDown: function(e) {

		if (!tool.clickedElement) return;
		
		if (e.keyCode == 27) {
			tool.deactivate();
		}
		
		if (e.keyCode == 87) { // w
			if (tool.transpose > 0) tool.transpose--;
			tool.highlightSelected();
		} else if (e.keyCode == 81) { // q
			tool.transpose++;
			tool.highlightSelected();
		}
		return false;
	},
	
	keyUp: function(e) {
		if (!tool.clickedElement) return;
		return false;
	},
	
	select_Target: function(e) {
		if (RMB_TARGET) {
			tool.clickedElement = RMB_TARGET;
			tool.selectedElement = RMB_TARGET;

			tool.addHighlightStyle(tool.markedElement);

			tool.selectedElements.push({
				RMB_TARGET,
			});

			tool.updateElementList();
			tool.triggerResize();
			return false;

		}
	},

	getPathHTML: function (element, transpose) {
		function getElmName (elm) {
			if (elm.id) {
				return "#" + elm.id;
			} else if (typeof elm.className == "string" && elm.className.trim().length) {
				return elm.tagName.toLowerCase() + "." + elm.className.trim().split(" ").join(".");
			} else {
				return elm.tagName.toLowerCase();
			}
		}

		let path = [];
		let currentElm = element;

		while (currentElm) {
			path.push(currentElm);
			currentElm = currentElm.parentElement;
		}

		path = path.reverse();

		let html = [];
		for (let i = 0; i < path.length; i++) {
			html.push(`${path.length - 1 - i == transpose ? "" : ""}${getElmName(path[i])}`);
		}

		return html.join(" > ");
	},

	updateElementList: function() {
		if (!tool.helpWindow) return;

		let elmList_selected = document.querySelector('#tool_selected_elm');
		let wind = document.querySelector('#tool_wnd');

		let line = "";

		if (tool.selectedElements.length) {

			line = tool.getPathHTML(tool.selectedElement);


			elmList_selected.classList.add('hasContent');
			wind.classList.add('hasContent');

		} else {
			elmList_selected.classList.remove('hasContent');
			wind.classList.remove('hasContent');
		}
		
		elmList_selected.innerHTML = line;
		document.querySelector('#tool_clicked_elm').innerHTML = tool.getPathHTML(tool.clickedElement);
		
		document.getElementById('tool_selected_elm').scrollTop = 9999;
		document.getElementById('tool_clicked_elm').scrollTop = 9999;

		let i = -1;
		for (let tr of document.querySelectorAll('#tool_selected_elm table tr')) {
			if (i < 0) { // skip heading
				i++;
				continue;
			}

			tr.selector = tool.selectedElements[i].selector;

			i++;
		}
	},
	
	activate: function() {
        fetch(chrome.runtime.getURL('tool_wnd/tool.html')).then(r => r.text()).then(html => {
            document.body.insertAdjacentHTML('afterend', html);
            // not using innerHTML as it would break js event listeners of the page
            let div = document.getElementById("tool_wnd");

			div.querySelector('.longer').addEventListener('click', function (e) {
				if (tool.transpose > 0) tool.transpose--;
				tool.highlightSelected();
			});
			div.querySelector('.shorter').addEventListener('click', function (e) {
				tool.transpose++;
				tool.highlightSelected();
			});

			div.querySelector('.send_selected').addEventListener('click', function (e) {
				var element = encodeURIComponent(tool.getPathHTML(tool.clickedElement));
				var block = encodeURIComponent(tool.getPathHTML(tool.selectedElement));
				var url = encodeURIComponent(document.location.href);
				var line = MANGA_TRACKER_URL + "?url=" + url + "&element=" + element + "&block=" + block;
				window.location = line;
			});

			div.querySelector('.ct_close').addEventListener('click', function (e) {
				tool.deactivate();
			});

			for (let elm of div.querySelectorAll('.ct_more a')) {
				elm.addEventListener('click', function (e) {

					tool.deactivate();
				});
			}
			
			// Добавление функционала перетаскивания
			const logo = div.querySelector('.ct_logo');
			let isDragging = false;
			let startX, startY, startLeft, startTop;
			
			logo.addEventListener('mousedown', function(e) {
				isDragging = true;
				startX = e.clientX;
				startY = e.clientY;
				
				// Получаем текущие координаты окна
				const rect = div.getBoundingClientRect();
				startLeft = rect.left;
				startTop = rect.top;
				
				// Меняем позиционирование на absolute для перетаскивания
				div.style.position = 'absolute';
				div.style.bottom = 'auto';
				div.style.right = 'auto';
				div.style.left = startLeft + 'px';
				div.style.top = startTop + 'px';
				
				e.preventDefault();
				e.stopPropagation();
				return false;
			});
			
			document.addEventListener('mousemove', function(e) {
				if (!isDragging) return;
				
				const deltaX = e.clientX - startX;
				const deltaY = e.clientY - startY;
				
				div.style.left = (startLeft + deltaX) + 'px';
				div.style.top = (startTop + deltaY) + 'px';
			});
			
			document.addEventListener('mouseup', function(e) {
				if (isDragging) {
					isDragging = false;
					
					// После перетаскивания оставляем absolute позиционирование
					// с новыми координатами
					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			});
			
			// Предотвращаем закрытие окна при клике внутри него
			div.addEventListener('mousedown', function(e) {
				e.stopPropagation();
			});
			
			div.addEventListener('click', function(e) {
				e.stopPropagation();
			});
			
			tool.helpWindow = div;

			tool.updateElementList();
			
			chrome.runtime.sendMessage({action: 'status', active: true});
		});
	},
	
	deactivate: function() {
		
		if (tool.markedElement) {
			tool.removeHighlightStyle(tool.markedElement);
		}
		tool.markedElement = false;

		if (tool.selectedElement) {
			tool.removeHighlightStyle(tool.selectedElement);
		}
		tool.selectedElement = false;
		if (tool.clickedElement) {
			tool.removeHighlightStyle(tool.clickedElement);
		}
		tool.clickedElement = false;

		tool.helpWindow.parentNode.removeChild(tool.helpWindow);
		
		chrome.runtime.sendMessage({action: 'status', active: false});
	},
	
	toggle: function() {
		if (tool.clickedElement) tool.deactivate();
		else tool.activate();
	},
	
	init: function() {
		document.addEventListener('keydown', tool.keyDown);
		document.addEventListener('keyup', tool.keyUp);
		
		chrome.runtime.onMessage.addListener(function(msg, sender, responseFun) {
			if (msg.action == "toggle") {
				tool.toggle();
				responseFun(2.0);
			}

			if (msg.action == "rmb_event") {
				if (tool.clickedElement) {
					tool.deactivate();
					tool.activate(); 
				} else {
					tool.activate(); 
				}
				responseFun(2.0);
				tool.select_Target(RMB_TARGET)
			}

		});
	}
}

tool.init();
