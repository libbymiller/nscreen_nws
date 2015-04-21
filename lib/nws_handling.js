//We keep data on what's showing on the TV, including human-displayable title
//and what we last showed so that it doesn't restart something that's playing already


var current_programme;
var current_programme_source_id;

var current_programme_title;
var current_programme_id;
var current_programme_pid;
var current_programme_nick;
var current_programme_title;
var current_programme_video;
var current_programme_image;
var current_programme_description;

var prev_current_programme;

var roster = {};

var last_message;//bleah - notifications issue - duplicates get sent

//my XMPP identity
var me = ""; //we need to know the anonymous id I'm given by the server

var networkWS = new NetworkWebSocket("org.mediascape.bbc.tv");
var pubSubHub = new NamedWS_PubSubHub(networkWS);


//subscribe to presnece messgaes

pubSubHub.subscribe('user.logged.out', function (data) {

  console.log("got presence message - logged out");
  var name = data.name;  

      if(name!=my_name){
      //ignore it if from me
      //need to fix this stuff@@
        var html=[];

        if($("#"+name).length > 0){
            $("#"+name).css("display","none"); //@@delete it?
            $("#"+name).remove(); //@@delete it?
        }else{
            $("#"+name).css("display","none");            
        }
      }
});


pubSubHub.subscribe('user.logged.in', function (data) {

  console.log("got presence message - logged in");
  var name = data.name;  

      if(name!=my_name){
      //ignore it if from me

        var html=[];
         if(!roster[name]){

           ///tell everyone about me too, if I've not seen them before
           pubSubHub.publish('user.logged.in', { 'agentid': my_name, 'name': my_name, "capabilities": capabilities });

           // including my state if I'm playing something
           if(capabilities["streamingVideo"]){
             console.log("sending update.programme message");
             var message = {id: current_programme_id, "pid": current_programme_pid, "video": current_programme_video, "title": current_programme_title, "image": current_programme_image, "description": current_programme_description, "nick": my_name}
             pubSubHub.publish("update.programme.state",message);
           }


           roster[name] = data.capabilities;
           if(data.capabilities.streamingVideo){ // a tv!
              console.log("got a tv!");
              update_tv();

           }else{
              html.push("<div class='snaptarget person' id='"+name+"'>");
              html.push("<img class='img_person' src='images/person.png'  />");
              html.push("<div class='friend_name'>"+name+"</div>");
              html.push("</div>");

           }
           if($("#" + name).length == 0) {
              $('#roster').prepend(html.join(''));
           }else{
              $("#"+name).replaceWith(html.join(''));
           }
           $(document).trigger('refresh');


         }
      }


});


//to send a goodbye message to the network
//to help with notifying everyone that we are gone

window.onbeforeunload= function (evt) {

//    networkWS.disconnect();//@@check me
}

//send a message


// to play a programme or share it
function sendProgramme(res,jid){
    //play sound
    var snd = document.getElementById("a2");
    snd.play();

    var title = res["title"];
    title = title.replace(/\"/g,"'");

    var desc = res["description"];
    desc = desc.replace(/\"/g,"'");

    var message = {id: res["id"], "pid": res["pid"], "video": res["video"], "title": res["title"], "image": res["img"], "description": desc, "nick": my_name}
    console.log("about to publish [1]");
    //update ourselves too
    current_programme_title = res["title"];
    current_programme_id = res["id"];
    current_programme_pid = res["pid"];;
    current_programme_nick = my_name;
    current_programme_image = res["img"];
    current_programme_video = res["video"];
    current_programme_description = desc
    console.log("updated current_programme_title to "+current_programme_title);
    update_tv();
    console.log("sending play.programme message");
    pubSubHub.publish("play.programme",message);
    console.log(message);
    return false;
}


var nws_isopen = false;


networkWS.onopen = function() {
  console.log("NWS opened");
  nws_isopen = true;
};


$(document).bind('send_name', function () {

  //put name in html page too
  $("#title").html(my_name);
  dologin();
});

function dologin(){
  console.log("loggging in");
  console.log("about to publish [2]");
  pubSubHub.publish('user.logged.in', {"agentid":my_name, "name":my_name, "capabilities":capabilities});

  console.log("sent message about user logging in");
}

//subscribe to updating messages

pubSubHub.subscribe('update.programme.state', function (data) {

               if(data && data.pid){
                 var video = data.video;
                 var title = data.title;
                 var name = data.nick;
      		 //the TV
                 if(video!=prev_current_programme || (!prev_current_programme)){
                   current_programme=video;
                   current_programme_title = title;
                   current_programme_source_id = data.id;

                   //update our representation of the tv
                   console.log("ROSTER "+name);
                   console.log(roster);

                   var got_video_capability = false;
                   for(var r in roster){
                      if(roster[r]["streamingVideo"]){
                         got_video_capability = true;
                         break;
                      }
                   }

                   if(capabilities["streamingVideo"] || got_video_capability){
                      console.log("We can stream video or see something that can");
                      update_tv();
                   }else{
                      console.log("NOOO, we can't stream video");
                   }

                 }
      
                $(document).trigger('refresh_buttons');
                $(document).trigger('refresh');

               }
            
});


//subscribe to programme messages

pubSubHub.subscribe('play.programme', function (data) {

               var name = data.nick;

               if(data && data.pid){

                 var id = generate_new_id(data,name);
                 var html = generate_html_for_programme(data,name,id);
                 var video = data.video;
                 var title = data.title;
      		 //the TV
                 if(video!=prev_current_programme || (!prev_current_programme)){
                   current_programme=video;
                   current_programme_title = title;
                   current_programme_source_id = data.id;

                   // if I can play it, do so
                   if(capabilities["streamingVideo"]){
                      $(document).trigger('play_video');
                   }

                   //update our representation of the tv
                   var got_video_capability = false;
                   for(var r in roster){
                      if(roster[r]["streamingVideo"]){
                         got_video_capability = true;
                         break;
                      }
                   }

                   if(capabilities["streamingVideo"] || got_video_capability){
                      console.log("We can stream video or see something that can");
                      update_tv();
                   }else{
                      console.log("We can't stream video or see anything that can");
                   }

                 }
      
                 //make the person box and the new shared item glow 
                  $( '#'+id ).addClass( "dd_highlight",10,function() {
                    setTimeout(function() {
                    $( '#'+id ).removeClass( "dd_highlight" ,100);
                    }, 1500 );
                  });

                  $( '#'+name ).addClass( "dd_highlight",10,function() {
                    setTimeout(function() {
                    $( '#'+name ).removeClass( "dd_highlight" ,100);
                    }, 1500 );
                  });
               }
        
               if(name && data.title){

                 var msg_text;
                 if(contains(name,my_tv)){
                   var tmp = data.title;
                   tmp = tmp.replace(" failed to play","");
                   msg_text = my_tv_name+" started playing "+tmp;
                   if(msg_text!=last_message){
                      build_notification(msg_text);
                      last_message=msg_text;
                   }
                 }

                $(document).trigger('refresh_buttons');
                $(document).trigger('refresh');

               }
            

});


function contains(n,arr){
 for (var i=0;i<arr.length; i++){
   if(n == arr[i]){
     return true;
   }
 }
 return false;  
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




         
//touch stuff
//this extends drag and drop to work on touchscreens
     
$.extend($.support, {
        touch: "ontouchend" in document
}); 
    

// Hook up touch events
$.fn.addTouch = function() {
        if ($.support.touch) {
                this.each(function(i,el){
                        el.addEventListener("touchstart", iPadTouchHandler, false);
                        el.addEventListener("touchmove", iPadTouchHandler, false);
                        el.addEventListener("touchend", iPadTouchHandler, false);
                        el.addEventListener("touchcancel", iPadTouchHandler, false);
                });
        }
};



//ensure that everything that should be draggable and droppable is
            
$(document).bind('refresh', function () {
                $( "#draggable" ).draggable();
                $( ".programme" ).draggable(
                        {
                        opacity: 0.7,
                        helper: "clone",
                        zIndex: 2700
                }).addTouch();

                $( ".snaptarget" ).droppable({
      
                        hoverClass: "dd_highlight",
                        drop: function(event, ui) {
        
                                var el = $(this);

                                var jid = el.attr('id');

                                var el3 = ui.helper;
                                var el2 = el3.parent();

                                var res = get_data_from_programme_html(el3);//??
                                var url = el3.attr('href');
                                sendProgramme(res,jid);
            
                                $( this ).addClass( "dd_highlight",10,function() {
                                        setTimeout(function() {
                                                el.removeClass( "dd_highlight" ,100);
                                        }, 1500 );
                        
                                });
                        }
                        
                }).addTouch();
         
                $( ".snaptarget_tv" ).droppable({  //for tvs
      
                        hoverClass: "dd_highlight",
                        drop: function(event, ui) {
        
                                var el = $(this);
                                var jid = el.attr('id');
    
                                var el3 = ui.helper;
                                var el2 = el3.parent();

                                var res = get_data_from_programme_html(el3);//??
                                var url = el3.attr('href');
                                var name = jid;
                                sendProgramme(res,my_tv);//??

                                $( this ).addClass( "dd_highlight",10,function() {
                                        setTimeout(function() {
                                                el.removeClass( "dd_highlight" ,100);

                                        }, 1500 );
                        
                                });

                        }
                        
                }).addTouch();
         
});

//adds an overlay and inserts related stuff
      
$(document).bind('refresh_buttons', function () {  
                $(".programme").unbind('click');
                $( ".programme" ).click(function() {
                        insert_suggest2($( this ).attr("id"));//??
                        return false;
    
                });
//.addTouch();
//    $(document).trigger('refresh');
});
     

///to and from html

function generate_new_id(j,n){
  var i = j["pid"]+"_"+n; //not really unique enough
  return i;                     
}


function generate_html_for_programme(j,n,id){
      var pid=j["pid"];
      var video = j["video"];
      var title=j["title"];
      var img=j["image"];
      var desc=j["description"];
      var keywords=j["keywords"];
      
      var html = [];

      html.push("<div id=\"shared_"+id+"\" pid=\""+pid+"\" href=\""+video+"\"  class=\"ui-widget-content button programme\">");

      html.push("<div><img class=\"img\" src=\""+img+"\" />");
      html.push("</div>");
      if(n){
        html.push("<span class=\"shared_by\">Shared by "+n+"</span>");
///        html.push("<div clear=\"both\"></div>");
      }
      html.push("<div clear=\"both\"></div>");
      html.push("<span class=\"p_title p_title_small\">"+title+"</span>");
      html.push("<span class=\"description large\">"+desc+"</span>");
//      html.push("<span class=\"keywords large\">"+keywords+"</span>");
      html.push("</div>");
      return html
}


function get_data_from_programme_html(el){
     var id = el.attr('id');
     var pid = el.attr('pid');
     var video = el.attr('href');
     var img = el.find("img").attr('src');
     var title=el.find(".p_title").text();
     title = title.replace(/\"/g,"'");
     var desc=el.find(".description").text();
     desc = desc.replace(/\"/g,"'");


     var explain=el.find(".explain").text();
     //var keywords=el.find(".keywords").text();

     var res = {};
     res["id"]=id;
     res["pid"]=pid;
     res["video"]=video;
     res["img"]=img;
     res["title"]=title;

     res["description"]=desc;
     res["explanation"]=explain;

     return res;

}

function update_tv(){
                     var html_tv = [];
                     html_tv.push("<h3 class='contrast'>NOW WATCHING</h3>");
                     html_tv.push("<div class='snaptarget_tv telly' id='thetv'>");
                     html_tv.push("<div style='float:right;font-size:16px;padding-top:10px;padding-right:10px;'>"+my_tv_name+"</div>");
                     html_tv.push("<div style='float:left'><img class='img_tv' src='images/tiny_tv.png' /></div>");
                     html_tv.push("<br clear=\"both\" />");

                     html_tv.push("<div class='dotted_spacer'>");
                     if(current_programme_title && current_programme_title!=""){
                       html_tv.push(current_programme_title);
                     }else{
                       html_tv.push("Nothing currently playing");
                     }
                     html_tv.push("</div>");
                     html_tv.push("</div>");
                     html_tv.push("<br clear=\"both\"></br>");
                     $('#tv').html(html_tv.join(''));

}
