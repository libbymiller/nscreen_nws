//We keep data on what's showing on the TV, including human-displayable title
//and what we last showed so that it doesn't restart something that's playing already


var current_programme;
var current_programme_source_id;
var current_programme_title;
var current_programme_id;
var current_programme_pid;
var current_programme_nick;
var current_programme_title;
var current_programme_image;
var current_programme_description;


var prev_current_programme;

var last_message;//bleah - notifications issue - duplicates get sent

//my XMPP identity
var me = ""; //we need to know the anonymous id I'm given by the server
var st = 6;//strophe connection status

URL = 'http://'+server+'/http-bind/';
var connection = new Strophe.Connection(URL);

//strophe status codes
var statusCodes=["ERROR","CONNECTING","CONNFAIL","AUTHENTICATING","AUTHFAIL","CONNECTED","DISCONNECTED","DISCONNECTING"]; 


//called when the xmpp link is made
function linked(status) {

    st = status;

//    out("connection status: "+statusCodes[status] );
    if (status == Strophe.Status.CONNECTED) {
      //logging
      console.log("connected");

      //announcing ourselves
      var pres = $pres({type:'available',priority: 10});
      connection.send(pres);  

      //join group. tmp for now 
      if(group_name && my_name){
        join_group(group_name);
      }else{
        //console.log("no group name sorry!");
      }

    }
    if (status == Strophe.Status.DISCONNECTED || status == Strophe.Status.DISCONNECTING) {
      //overlay to warn users that they are not connected
      show_disconnect();
    }
  
}


function set_group_name(gn){
  if(gn && gn!=""){
    group_name = gn;
  }
}


//create or join group
function join_group(group_name){

  var room = group_name+"@"+group_server+"/"+my_name;
  var pres = $pres({to: room}).c('x', {xmlns: 'http://jabber.org/protocol/muc'}).tree();
  connection.sendIQ(pres);

  send_group_message("{'type':'tv'}");
  if(current_programme && current_programme!=""){
    send_group_message(get_status());
  }
}


function get_status(){
  return "{ \"type\":\"tv\", \"pid\": \""+current_programme_id+"\",  \"title\": \""+current_programme_title+"\",  \"nick\": \""+current_programme_nick+"\",  \"id\": \""+current_programme_source_id+"\",  \"video\": \""+current_programme+"\",  \"description\": \""+current_programme_description+"\",  \"image\": \""+current_programme_image+"\"}";
}

function send_group_message(text){

      var room = group_name+"@"+group_server;
      var stanza = new Strophe.Builder( "message", {"to": room,
         "type": "groupchat"} ).c("body").t(text);
      connection.send(stanza);

}


//send a chat command
function sendCommand(text,to) {
    if (st == Strophe.Status.CONNECTED) { 
      var stanza = new Strophe.Builder( "message", {"to": to,
         "type": "chat"} ).c("body").t(text);
      connection.send(stanza);
    } 
}

//to send a goodbye message to the network
//to help with notifying everyone that we are gone

window.onbeforeunload= function (evt) {
    if (st == Strophe.Status.CONNECTED) { 
       //first send a status msg
       var pres = $pres({type:'unavailable',priority: 10});
       connection.send(pres);
       connection.flush(); 
       connection.disconnect(); 
    }
}

//logging
function out(msg) {
  var out = document.getElementById('out');
  out.innerHTML = msg;
}


//called to tell the brain that we want to play something
//or to give the programme to another user
function sendProgramme(res,jid){
    var snd = document.getElementById("a2");
    snd.play();

    jid = jid.replace(/\@.*/,"");

    str = "{\"id\":\""+res["id"]+"\",\"pid\":\""+res["pid"]+"\", \"video\":\""+res["video"]+"\",\"title\":\""+res["title"]+"\", \"image\":\""+res["img"]+"\",\"description\":\""+res["description"]+"\", \"nick\":\""+my_name+"\"}"

    var room_person = group_name+"@"+group_server+"/"+jid;

    sendCommand(str,room_person);
    //console.log("sending "+str+" to "+room_person);
    return false;
}



function on_presence(presence) {
    event = Strophe.getText(presence.firstChild);
    var fr = $(presence).attr('from');
    var ty = $(presence).attr('type');
    var x = $(presence).find('item').attr('role');//make sure it's the particpant or owner, not the thing itself

      if(fr.match(my_name)){

      }else{

       if(ty && ty=="unavailable"){

       }else{
         //we have a new joiner
         if(x){
            sendCommand("{'type':'tv'}",fr);
            if(current_programme && current_programme!=""){
              sendCommand(get_status(),fr);
            }
         }
       }

      }
    return true;
}



$(document).bind('send_name', function () {

  //put name in html page too
  $("#title").html(my_name);

  var room = group_name+"@"+group_server+"/"+my_name;

  var pres = $pres({to: room}).c('x', {xmlns: 'http://jabber.org/protocol/muc'}).tree();
  connection.sendIQ(pres);
});


//respond to message

function on_message(msg) {
    var elems = msg.getElementsByTagName('body'); 

    var type = msg.getAttribute('type');
    var fr = $(msg).attr('from')
    n = tidy_from(fr);

    if (type == "chat" || type == "groupchat"  && elems.length > 0) {  
        var body = elems[0];  
        var text = Strophe.getText(body); 
        //console.log("text "+text)

        var j = eval("z="+text);

        //fugly
      
        if(j['type'] && j['type']=='tv'){

            //remove the old one
            var name = tidy_from(fr);
            my_tv = name;
///do nothing??

        }else{

          if(j["video"]){
//play it@@
//set the title, id etc to the right things
//start it playing
            current_programme_source_id = j["id"]
            current_programme_id = j["id"]
            current_programme_pid = j["pid"]
            current_programme_nick = j["nick"]
            current_programme_title = j["title"]
            current_programme = j["video"]
            current_programme_image = j["image"]
            current_programme_description = j["description"]

            //console.log("prog: "+current_programme);
            $(document).trigger('play_video');
          }

        }
        return true;
    }     
}


function tidy_from(fr){
  var z = fr.replace(/.*\//,"");
  return z; 
}    


      
function on_group_message(msg) {
    var elems = msg.getElementsByTagName('body');
    var type = msg.getAttribute('type');
//nuffing for now
    return true;
}
    

function build_notification(msg_text){
                 var p = $("#notify").text();
                 var num = parseInt(p);

                 if(!num){
                   num=1;
                 }else{
                   num = num+1;
                 }
                 $("#notify").html(num);
                 $("#notify").show();

                 $("#notify_large").prepend("<div class='dotty_bottom'>"+msg_text+" </div>");//not sure if append / prepend makes most sense.

}


connection.addHandler( on_group_message,     null,    "message" );
connection.addHandler( on_message,     null,     "message",    "chat");
connection.addHandler(on_presence, null, "presence");


//strophe logging
//doesn't work on mozilla
//connection.rawInput = function (data) { console.log(data)};
//connection.rawOutput = function (data) { console.log(data) };

///end of strophe-only stuff
//the remainder in this file is a combination of strophe-related and drag and drop
    
function go(){
  if(use_strophe){
    connection.connect( server,"",linked);
  }
}

