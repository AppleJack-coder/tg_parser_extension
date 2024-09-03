function forwardRequest(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (!response) return reject(chrome.runtime.lastError)
            return resolve(response)
        })
    })
}
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var checked_ids = [];
var parsed_data_batch = [];

async function get_text_without_children(elem) {
    // Get all child nodes
    let elem_children = elem.childNodes;
    let target_text = '';
    let acceptable_nodes = ['em', 'a']

    for (let i = 0; i < elem_children.length; i++) {
        let childNode = elem_children[i];
        
        if (childNode.nodeType === 3 || acceptable_nodes.includes(childNode.tagName.toLowerCase())) {
            target_text += childNode.textContent;
        } else if (childNode.tagName.toLowerCase() == 'img') {
            target_text += childNode.getAttribute('alt');
        }
    }

    return target_text;
}

async function get_msg_type(msg_text_div) {
    let translatable_div = msg_text_div.querySelector('.translatable-message');

    if (translatable_div) {
        return [1, translatable_div];
    } else {
        return [0, NaN];
    }
}

async function get_message_text(bubble) {
    var msg_text_div = bubble.querySelector('.bubble-content .message');
    var [msg_type, msg_elem] = await get_msg_type(msg_text_div);

    var msg_text = '';
    if (msg_type == 0) {
        msg_text = await get_text_without_children(msg_text_div);
    } else if (msg_type == 1) {
        msg_text = msg_elem.textContent;
    }

    // Link with preview

    // Plain link

    return msg_text;
}

async function get_message_data(bubble, data_mid) {
    let data_peer_id = parseInt(bubble.getAttribute('data-peer-id'));
    let data_timestamp = parseInt(bubble.getAttribute('data-timestamp'));
    
    let msg_text='';
    try {
        msg_text = await get_message_text(bubble);
    } catch (error) {}

    let forwarded_elem = bubble.querySelector('.bubble-name-forwarded');
    let forwarded_from = (forwarded_elem ? true : false);

    let forwarded_name = ''
    // let forwarded_avatar = ''
    if (forwarded_from) {
        forwarded_name = forwarded_elem.querySelector('.peer-title').textContent;
        // forwarded_avatar = forwarded_elem.querySelector('.avatar-photo:not(.avatar-photo-thumbnail)');
    }

    // let msg_webpage_preview = parseInt(bubble.getAttribute(''));
    // let imgs_attached = parseInt(bubble.getAttribute(''));
    // let docs_attached_ids = parseInt(bubble.getAttribute(''));

    parsed_data_batch.push({
        "data-mid": data_mid,
        "data-peer-id": data_peer_id,
        "data-timestamp": data_timestamp,
        "msg-text": msg_text,

        "forwarded-from": forwarded_from,
        // "forwarded-avatar": forwarded_avatar,
        "forwarded-name": forwarded_name
    })
}

async function parse() {
    var controls_state = await forwardRequest({target: 'controls_state', method: 'get'});
    
    if (!controls_state.start) {
        console.log('Start parse');
        var settings = await forwardRequest({target: 'settings', method: 'get'});

        var chatIds_list = settings.chatIds_list;
        var messages_amount = settings.messages_amount;
        var batch_size = settings.batch_size;

        let current_url = window.location.href;
        console.log(current_url);
        let current_chatId = current_url.split('#')[1];
        console.log(current_chatId);
        
        var next_chatId = undefined;
        if (!chatIds_list.includes(current_chatId)) {
            console.log('Go to url');
            window.open('https://web.telegram.org/k/#'+chatIds_list[0], '_blank').focus();
            return;
        } else {
            let current_chatId_index = chatIds_list.indexOf(current_chatId);
            if (current_chatId_index < chatIds_list.length-1){
                next_chatId = chatIds_list[current_chatId_index+1];
            }
        }

        // Get available messages
        var bubbles_list = document.querySelectorAll('.bubble:not(.is-date)');

        // For loop
        var is_new = false;
        for (let i = 0; i < bubbles_list.length; i++) {
            let bubble = bubbles_list[i];
            
            let data_mid = parseInt(bubble.getAttribute('data-mid'));
            
            // Check for dublicate
            if (checked_ids.includes(data_mid)) {
                continue
            } else {
                // add id to checkedIds
                checked_ids.push(data_mid);
                is_new = true;
            }

            // get current target message
            await get_message_data(bubble, data_mid);
            
        }

        // Go to next page if there were no new messages added
        // and download result file
        if (!is_new) {
            await forwardRequest({target: 'batch_msgs_data', method: 'save', data: parsed_data_batch, chatId: current_chatId});
            // await forwardRequest({target: 'download', chatId: current_chatId});

            if (next_chatId) {
                console.log('Go to url');
                window.open('https://web.telegram.org/k/#'+next_chatId, '_blank').focus();
                return;
            } else {
                await forwardRequest({target: 'controls_state', method: 'set', state: {start: true, stop: false}});
                return await parse();
            }
        }

        // Save to local storage if messages amount is more than barch_size
        // send batch with chatId
        // also in service worker keep track of batch numbers and chatId
        if (parsed_data_batch.length >= batch_size) {
            await forwardRequest({target: 'batch_msgs_data', method: 'save', data: parsed_data_batch, chatId: current_chatId});
            // clear array with messages
            parsed_data_batch = [];
        }

        bubbles_list[0].scrollIntoView({ behavior: "smooth", block: "center"});
        
        console.log(parsed_data_batch);
        return setTimeout(async () => {
            await parse();
        }, 1000);

    } else {
        console.log('Waiting');
        await timeout(5000);
        return await parse();
    }
   
}

setTimeout(async ()=>{
    await parse();
}, 1000);