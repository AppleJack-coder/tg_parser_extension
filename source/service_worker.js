chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.target == 'download') {
        chrome.storage.local.get({last_batch_ids: {}}).then(async (result) => {
          last_batch_ids = result.last_batch_ids;
          console.log(last_batch_ids);
          var last_batch = last_batch_ids[request.chatId];
          let result_batch_data = [];
          for (let i = 0; i < last_batch; i++) {
            var target_name = request.chatId+'_'+i.toString();
            result_batch_data = result_batch_data.concat((await chrome.storage.local.get({[target_name]: {}}))[target_name]);
            await chrome.storage.local.set({[target_name]: {}});
          }
          delete last_batch_ids[request.chatId];
          await chrome.storage.local.set({last_batch_ids: last_batch_ids});
          result_batch_data.sort(function(first, second) {
            return second['data-mid'] - first['data-mid'];
          });
          sendResponse({chatId: request.chatId, data: JSON.stringify(result_batch_data, NaN, 4,)});
        });
    } else if (request.target == 'settings') {
        if (request.method == 'get') {
            chrome.storage.local.get({settings: {chatIds_list: ['@ExampleId1', '@ExampleId2'], messages_amount: 0, batch_size: 500}}).then((result) => {
                sendResponse(result.settings);
            });
        } else if (request.method == 'set') {
            chrome.storage.local.set({settings: request.settings}).then(() => {
                sendResponse({});
            });
        }
    } else if (request.target == 'controls_state') {
      if (request.method == 'get') {
        chrome.storage.local.get({controls_state: {start: true, stop: false, clear_logs: true, clear_parsed: true, download: true}}).then((result) => {
            sendResponse(result.controls_state);
        });
      } else if (request.method == 'set') {
        chrome.storage.local.get({controls_state: {start: true, stop: false, clear_logs: true, clear_parsed: true, download: true}}).then((result) => {
          var controls_state = result.controls_state;
          for (var key in request.state) {
              if (request.state.hasOwnProperty(key)) {
                  let target_button = key;
                  let target_state = request.state[key];

                  controls_state[target_button] = target_state;
              }
          }
          chrome.storage.local.set({controls_state: controls_state}).then(() => {
              sendResponse({});
          });
        });
      }
    } else if (request.target == 'batch_msgs_data') {
      if (request.method == 'save') {
        chrome.storage.local.get({last_batch_ids: {}}).then((result) => {
          var last_batch_ids = result.last_batch_ids;
          var target_batch = 0;
          if (last_batch_ids.hasOwnProperty(request.chatId)) {
            target_batch = last_batch_ids[request.chatId]+1;
          }
          chrome.storage.local.set({[request.chatId+'_'+target_batch.toString()]: request.data}).then(() => {
            last_batch_ids[request.chatId] = target_batch+1;
            chrome.storage.local.set({last_batch_ids: last_batch_ids}).then(() => {                
              sendResponse({});
            });
          });
        });
      }
    }
    return true;
});


// Allows users to open the side panel by clicking on the action toolbar icon
const TG_ORIGIN = 'web.telegram.org';
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);
  // Enables the side panel on telegram site
  if (url.origin.includes(TG_ORIGIN)) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true
    });
  } else {
    // Disables the side panel on all other sites
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
  }
});