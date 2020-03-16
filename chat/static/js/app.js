var currentRecipient = '';
var currentRecipient_fullname = '';
var chatInput = $('#chat-input');
var chatButton = $('#btn-send');
var videoChatButton = $('#btn-videochat');
var userList = $('#user-list');
var messageList = $('#messages');
var users = [];


function beep(){
    document.getElementById("beep_sound").play();
}

function uuid4(){
    var uuid = '', ii;
    for (ii = 0; ii < 32; ii += 1) {
        switch (ii) {
            case 8:
            case 20:
                uuid += '-';
                uuid += (Math.random() * 16 | 0).toString(16);
                break;
            case 12:
                uuid += '-';
                uuid += '4';
                break;
            case 16:
                uuid += '-';
                uuid += (Math.random() * 4 | 8).toString(16);
                break;
            default:
                uuid += (Math.random() * 16 | 0).toString(16);
        }
    }
    return uuid;
}

function user_is_in_list(user) {
    return users.indexOf(parseInt(user))>=0;
}

function no_chat_broadcast(){
    if(!currentRecipient) return true;
    if(currentRecipient==currentUser) return true;
    return false;
}

function active_chat_with(user){
    return user_is_in_list(user) && user==currentRecipient;
}

function inactive_chat_with(user){
    if(user==currentUser)return false;
    return user==currentRecipient &! user_is_in_list(user);
}

function make_inactive_others() {
    $( "a.user" ).removeClass("active");
}

function make_active(user) {
    $( "a.user[user='" + user + "']" ).addClass("active");
    $( "a.user[user='" + user + "']" ).removeClass("text-secondary");
}

function make_unread(user) {
    $( "a.user[user='" + user + "']" ).addClass("text-secondary");
    beep();
}

function message_is_for_active_chat(sender, recipient) {
    if(sender == currentRecipient) return true;
    if(recipient == currentRecipient && sender == currentUser) return true;
    return false;
}

function addClickEvent(){
    // add click event
    $(userList).children('.item').last().children('.user').first().on("click",
        function () {
            var target = $(event.target);
            userList.children('.item').children('.active').removeClass('active');
            target.addClass('active');
            setCurrentRecipient(username=target.attr('user'),
                                full_name=target.text(),
                                room_name=room_name);
        }
    );
}

function addRemoveEvent(){
    // add delete click event
    $(userList).children('.item').last().children('.item_delete').first().on("click",
        function () {
            var user_to_remove = $(event.target).parent().children('.user').first().attr('user');
            removeUserFromList(user=user_to_remove,
                               manual_remove=true);
        }
    );
}

function addUserDiv(user, user_fullname) {
    // build HTML user element in list
    var userItem = `<div class="item mb-2">
                        <a role="button" user="${user}" class="user btn btn-outline-secondary w-75 p-3"`;
    if (user == currentUser) userItem += `>Scrivi a tutti</a>`;
    else userItem += `>${user_fullname}</a> &nbsp;&nbsp;`;
    if (currentUser != user)
        userItem += `<svg class="icon icon-danger icon-xs item_delete">
                        <use xlink:href="/static/svg/sprite.svg#it-close-circle"></use>
                    </svg>`;
    userItem += `</div>`;

    $(userItem).appendTo(userList);
    addClickEvent();
    addRemoveEvent();
}

function drawMessage(message, user_fullname, from_bot=false) {
    console.log("drawMessage " + message);
    var avatar = currentRecipient_fullname;
    if (user_fullname) avatar = user_fullname;
    if (message.user == currentUser) avatar = 'io';
    var position = 'left';
    if (from_bot) {
        var date = new Date();
        var msg_body = message;
    } else {
        var date = new Date(message.created);
        if (message.user == currentUser) position = 'right';
        var msg_body = message.body;
    }
    const messageItem = `
            <li class="message ${position}">
                <div class="avatar">
                    <span>${avatar}</span>
                </div>
                <div class="text_wrapper">
                    <div class="text">${msg_body}<br>
                        <span class="text-muted chat-date-info">${date}</span>
                    </div>
                </div>
            </li>`;
    $(messageItem).appendTo('#messages');
}

function getConversation(recipient, room_name) {
    console.log("getConversation " + recipient);
    $.getJSON(`/api/v1/message/?target=${recipient}&room=${room_name}`, function (data) {
        messageList.children('.message').remove();
        for (var i = data['results'].length - 1; i >= 0; i--) {
            console.log("getConversation " + data['results'][i]);
            drawMessage(message=data['results'][i]);
        }
        make_inactive_others();
        make_active(currentRecipient);
        messageList.animate({scrollTop: messageList.prop('scrollHeight')});
    });
}

function addUserInList(user, user_fullname, block_bot=false) {
    console.log("addUserInList: " + user);
    console.log("currentrecipient: "+ currentRecipient);
    if (!user_is_in_list(user)) {
        addUserDiv(user=user, user_fullname=user_fullname);
        if (user != currentUser) users.push(parseInt(user));
        if (user == currentRecipient) {
            if(!block_bot)
                drawMessage(message="L'utente è rientrato nella chat",
                            user_fullname='BOT',
                            from_bot=true);
            messageList.animate({scrollTop: messageList.prop('scrollHeight')});
            enableInput();
            make_active(user);
        } else if (currentRecipient && block_bot) {
            make_active(user);
            make_unread(user);
        }
    } else if (user != currentRecipient) {
        make_unread(user);
    }
}

function removeUserFromList(user, manual_remove=false) {
    console.log("removeUserFromList:" + user);
    $("a.user[user='"+ user +"']").parent().remove();
    console.log(users);
    var user_index = users.indexOf(parseInt(user))
    users.splice(user_index, 1);
    console.log("Users list after remove: " + user);
    // if currentRecipient leaves the room, you can't write anymore
    if (user == currentRecipient){
        if (!manual_remove) {
            drawMessage(message="L'utente ha abbandonato la chat",
                        user_fullname='BOT',
                        from_bot=true);
            messageList.animate({scrollTop: messageList.prop('scrollHeight')});
        }
        disableInput();
    }
    //currentRecipient = null;
    console.log(users);
}

function getMessageById(message, room_name) {
    id = JSON.parse(message).message;
    user_fullname = JSON.parse(message).user_fullname;
    console.log("getMessageById: " + currentRecipient);

    $.getJSON(`/api/v1/message/${id}/?room=${room_name}`, function (data) {
        if(message_is_for_active_chat(sender=data.user,
                                      recipient=data.recipient)){
            if(inactive_chat_with(data.user)){
                addUserInList(user=data.user,
                              user_fullname=user_fullname,
                              block_bot=true);
                make_active(data.user);
                beep();
            }
            enableInput();
            drawMessage(message=data,
                        user_fullname=user_fullname);
            messageList.animate({scrollTop: messageList.prop('scrollHeight')});
        }
        else if(!user_is_in_list(data.user)) {
            addUserInList(user=data.user,
                          user_fullname=user_fullname,
                          block_bot=true);
            make_unread(data.user);
        }
        else {
            make_unread(data.user);
        }
    });
}

function sendMessage(recipient, room_name, body, broadcast=0) {
    console.log("sendMessage / broadcast " + broadcast);
    $.post('/api/v1/message/', {
        recipient: recipient,
        room: room_name,
        body: body,
        broadcast: broadcast
    }).fail(function () {
        alert('Error! Check console!');
    });
}

function setCurrentRecipient(username, full_name, room_name) {
    currentRecipient = username;
    currentRecipient_fullname = full_name;
    getConversation(recipient=currentRecipient, room_name=room_name);
    enableInput();
}

function enableInput() {
    chatInput.prop('disabled', false);
    chatButton.prop('disabled', false);
    if (currentRecipient!=currentUser) videoChatButton.prop('disabled', false);
    chatInput.focus();
}

function disableInput() {
    chatInput.prop('disabled', true);
    chatButton.prop('disabled', true);
    videoChatButton.prop('disabled', true);
}

$(document).ready(function () {
    disableInput();
    var socket = new WebSocket(
        'ws://' + window.location.host +
        '/ws/chat/' + room_name + '/?session_key=' + sessionKey);
    chatInput.keypress(function (e) {
        if (e.keyCode == 13)
            chatButton.click();
    });

    chatButton.click(function () {
        if (chatInput.val().length > 0) {
            // broadcast message to all users of room
            if (currentRecipient==currentUser) {
                for (var i=0; i<users.length; i++) {
                    sendMessage(recipient=users[i],
                                room_name=room_name,
                                body=chatInput.val(),
                                broadcast=1);
                }
            } else {
                sendMessage(recipient=currentRecipient,
                            room_name=room_name,
                            body=chatInput.val());
            }
            chatInput.val('');
        }
    });

    videoChatButton.click(function () {
        videochat_text="Clicca qui per entrare in videoconferenza ";
        videochat_url="https://meet.jit.si/"+ uuid4();
        window.open(videochat_url, '_blank');
        sendMessage(recipient=currentRecipient,
                    room_name=room_name,
                    body=videochat_text + " " + videochat_url);
    });

    socket.onmessage = function (e) {
        json_data = JSON.parse(e.data)
        console.log("socket.onmessage: " + json_data);
        if (json_data['command'])
            switch (json_data['command']) {
                case 'join_room':
                    console.log("received join room: " + json_data['user']);
                    console.log(json_data);
                    addUserInList(user=json_data['user'],
                                  user_fullname=json_data['user_fullname']);
                    break;
                case 'leave_room':
                    console.log("received leave room: " + json_data['user']);
                    removeUserFromList(user=json_data['user']);
                    break;
                case 'add_user':
                    console.log("add user: " + json_data['user']);
                    addUserInList(user=json_data['user'],
                                  user_fullname=json_data['user_fullname']);
                    break;
            }
        else if (json_data['message']) {
            console.log("message: " + e.data);
            getMessageById(message=e.data, room_name=room_name);
        }

    };
});
