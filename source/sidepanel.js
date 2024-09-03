function forwardRequest(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (!response) return reject(chrome.runtime.lastError)
        return resolve(response)
      })
    })
}

var input_errors = 0;

// Get current settings and update UI
// settings = {
//     chatIds_list: [
//         '@ExampleId'
//     ],
//     messages_amount: 0,
//     batch_size: 1
// }
async function get_current_settings() {
  let current_settings = await forwardRequest({target: 'settings', method: 'get'});

  // ChatIds
  let chatIds_list = current_settings.chatIds_list;
  loop = 0;
  chatIds_list.forEach(chatId => {
    if (loop != 0) {
      addChatId();
    }
    let chatIdInputElem = document.querySelector('.chatids-list li ul:last-of-type input');
    chatIdInputElem.value = chatId;
    loop += 1
  });

  // Messages amount
  document.querySelector('#msg-amount-input').value = current_settings.messages_amount;

  // Batch size
  document.querySelector('#batch-size-input').value = current_settings.batch_size;
}

// Get current logs
// logs = [
//     'Test log entry 1',
//     'Test log entry 2'
// ]
async function get_logs() {
    
}

// Get controls state
// controls_state = {
//     start: true,
//     stop: false,
//     clear_logs: true,
//     clear_parsed: true,
//     download: false
// }
async function get_controls() {
    let controls_state = await forwardRequest({target: 'controls_state', method: 'get'});

    document.querySelector('#start-btn').disabled = !controls_state.start;
    document.querySelector('#stop-btn').disabled = !controls_state.stop;
    document.querySelector('#clear-logs-btn').disabled = !controls_state.clear_logs;
    document.querySelector('#clear-parsed-btn').disabled = !controls_state.clear_parsed;
    document.querySelector('#download-btn').disabled = !controls_state.download;
}

// Get progress bars
// progress = {
//     0: {
//         chatId: '@ExampleId',
//         parsed_amount: 12,
//         target_amount: 34
//     }
// }
async function get_progress() {
    
}

// Save changes
function save_settings() {
  var settings = {
    chatIds_list: [],
    messages_amount: 0,
    batch_size: 1
  }

  // ChatIds
  let chatId_list = document.querySelectorAll('.chatids-list input');
  for (let i = 0; i < chatId_list.length; i++) {
    let chatId = chatId_list[i];
    if (chatId.value != '') {
      settings.chatIds_list.push(chatId.value);
    }
  }

  // Messages amount
  settings.messages_amount = parseInt(document.querySelector('#msg-amount-input').value);

  // Batch size
  settings.batch_size = parseInt(document.querySelector('#batch-size-input').value);
  
  forwardRequest({target: 'settings', method: 'set', settings: settings}).then((response) => {
    forwardRequest({target: 'controls_state', method: 'set', state: {start: false, stop: true}});
  });
}


function handle_input_error(elem, error=true) {
  if (!elem.classList.contains('input-error') && error) {
    input_errors += 1;
    elem.classList.add('input-error');
  } else if (elem.classList.contains('input-error') && !error) {
    input_errors -= 1;
    elem.classList.remove('input-error');
  }
}
function block_start_btn(block=true) {
  document.querySelector('#start-btn').disabled = block;
}

// Check chatIds format (should include @)
function checkChatIdsFormat(event) {
  let elem = event.target;
  if (!elem.value.startsWith('@')) {
    handle_input_error(elem, error=true);
  } else {
    handle_input_error(elem, error=false);
  }
}
document.querySelector('.chat-id').addEventListener('input', checkChatIdsFormat);

// Check messages amount format (should be -1 or any integer)
document.querySelector('#msg-amount-input').addEventListener('input', (event) => {
  let elem = event.target;
  if (!(/^\d+$/.test(elem.value)) || parseInt(elem.value) < 0) {
    handle_input_error(elem, error=true);
  } else {
    handle_input_error(elem, error=false);
  }
});

// Check batch size (should be more than 0)
document.querySelector('#batch-size-input').addEventListener('input', (event) => {
  let elem = event.target;
  if (!(/^\d+$/.test(elem.value)) || parseInt(elem.value) < 1) {
    handle_input_error(elem, error=true);
  } else {
    handle_input_error(elem, error=false);
  }
});

function changeChatIdBtns(elem, minus, plus) {
  let wrapper = elem.parentNode;
  let minus_elem = wrapper.querySelector('.remove');
  let plus_elem = wrapper.querySelector('.add');

  minus_elem.disabled = !minus;
  plus_elem.disabled = !plus;
}

// Control chat ids amounts
function chatIdsControl() {
  let chatIdElems = document.querySelectorAll('input[name="chat-id"]');
  let lastChatIdElem = chatIdElems[chatIdElems.length-1];
  if (chatIdElems.length > 1) {
    if (lastChatIdElem.value.startsWith('@')) {
      changeChatIdBtns(lastChatIdElem, minus=true, plus=true);
    } else if (!lastChatIdElem.value.startsWith('@')) {
      changeChatIdBtns(lastChatIdElem, minus=true, plus=false);
    }
  } else if (chatIdElems.length == 1) {
    if (lastChatIdElem.value.startsWith('@')) {
      changeChatIdBtns(lastChatIdElem, minus=false, plus=true);
    } else if (!lastChatIdElem.value.startsWith('@')) {
      changeChatIdBtns(lastChatIdElem, minus=false, plus=false);
    }
  }
}
// Add chatId
function addChatId() {
  let sectionNode = document.querySelector('.chatids-list li');
  let buttons = sectionNode.querySelectorAll('ul:last-of-type button');

  let chatIdElem_clone = sectionNode.querySelector('ul:last-of-type').cloneNode(true);

  buttons.forEach(button => {
    button.disabled = true;
    button.style.visibility = 'hidden';
  });

  let input_elem = chatIdElem_clone.querySelector('input');
  input_elem.value = '';
  input_elem.addEventListener('input', checkChatIdsFormat);

  let add_elem = chatIdElem_clone.querySelector('button.add');
  add_elem.disabled = true
  add_elem.addEventListener('click', addChatId);

  let remove_elem = chatIdElem_clone.querySelector('button.remove');
  remove_elem.disabled = true
  remove_elem.addEventListener('click', removeChatId);

  sectionNode.appendChild(chatIdElem_clone);
} 
document.querySelector('.add').addEventListener('click', addChatId);
// Remove chatId
function removeChatId() {
  let sectionNode = document.querySelector('.chatids-list li');
  sectionNode.removeChild(sectionNode.querySelector('ul:last-of-type'));

  let buttons = sectionNode.querySelectorAll('ul:last-of-type button');

  buttons.forEach(button => {
    button.disabled = true;
    button.style.visibility = 'visible';
  });
} 
document.querySelector('.add').addEventListener('click', addChatId);

// Extension controls
document.querySelector('#start-btn').addEventListener('click', (event) => {
  if (input_errors != 0) {
    let error_popup_elem = document.querySelector('.error-popup');
    error_popup_elem.classList.remove('hide');
    error_popup_elem.classList.add('show');
    setTimeout(() => {
      error_popup_elem.classList.remove('show');
      error_popup_elem.classList.add('hide');
    }, 3000);
  } else {
    save_settings();
  }
});
document.querySelector('#stop-btn').addEventListener('click', (event) => {
  forwardRequest({target: 'controls_state', method: 'set', state: {start: true, stop: false}});
});
document.querySelector('#download-btn').addEventListener('click', async (event) => {
  let chatIds_list = document.querySelectorAll('input[name="chat-id"]');
  let download_loop = parseInt(document.querySelector('#download-btn').value);

  var response = await forwardRequest({target: 'download', chatId: chatIds_list[download_loop].value})
  
  let options = {
    suggestedName: response.chatId + '.json',
    types: [
      {
        description: 'Json Files',
        accept: {
          'application/json': ['.json'],
        },
        startIn: 'downloads'
      },
    ],
  };
  let handle = await window.showSaveFilePicker(options);

  let writable = await handle.createWritable();
  await writable.write(response.data);
  await writable.close();

  document.querySelector('#download-btn').value = (download_loop+1).toString();
})


// First requests
setTimeout(async () => {
  await get_current_settings();
}, 100);

// Update loop
setInterval(async () => {
  chatIdsControl();
  get_controls();
}, 200);