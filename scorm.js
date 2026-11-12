/* SCORM 1.2 bridge — Course Kit engine (shared by every module)
   Discovers the LMS API up the frame chain; no-ops gracefully when
   launched standalone (GitHub Pages, local file, etc.). */
(function(){
  "use strict";
  function findAPI(win){
    var hops=0;
    try{
      while(win && hops<10){
        if(win.API) return win.API;
        if(win.parent===win) break;
        win=win.parent; hops++;
      }
    }catch(e){/* cross-origin wall — stop looking */}
    try{ if(window.opener) {
      var o=window.opener, n=0;
      while(o && n<10){ if(o.API) return o.API; if(o.parent===o) break; o=o.parent; n++; }
    }}catch(e){}
    return null;
  }
  var api=findAPI(window);
  /* no LMS (a web preview, GitHub Pages): keep the same SCORM data in this browser so a refresh resumes.
     Not in QA mode (?qa=1); ?fresh=1 starts over. */
  if(!api&&!/[?&]qa=1/.test(location.search)){
    try{
      var KEY='ck-scorm-'+location.pathname,store={};
      if(/[?&]fresh=1/.test(location.search))localStorage.removeItem(KEY);
      try{store=JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){store={};}
      var keep=function(){try{localStorage.setItem(KEY,JSON.stringify(store));}catch(e){}};
      api={LMSInitialize:function(){return "true";},LMSFinish:function(){keep();return "true";},
           LMSGetValue:function(k){if(k==='cmi.interactions._count'){var c=0;while(('cmi.interactions.'+c+'.id') in store)c++;return String(c);}return (k in store)?store[k]:"";},
           LMSSetValue:function(k,v){store[k]=String(v);return "true";},LMSCommit:function(){keep();return "true";},
           LMSGetLastError:function(){return "0";},LMSGetErrorString:function(){return "";},LMSGetDiagnostic:function(){return "";},_local:true};
    }catch(e){api=null;}
  }
  var connected=false;
  window.SCORM={
    present: !!api,
    init: function(){
      if(!api) return false;
      try{
        connected = (api.LMSInitialize("")==="true" || api.LMSInitialize("")===true);
        if(connected){
          var st=api.LMSGetValue("cmi.core.lesson_status");
          if(st==="not attempted"||st==="unknown"||st===""){
            api.LMSSetValue("cmi.core.lesson_status","incomplete");
            api.LMSCommit("");
          }
        }
      }catch(e){ connected=false; }
      return connected;
    },
    get: function(k){ try{ return connected ? String(api.LMSGetValue(k)) : ""; }catch(e){ return ""; } },
    set: function(k,v){ try{ if(connected) api.LMSSetValue(k,String(v)); }catch(e){} },
    commit: function(){ try{ if(connected) api.LMSCommit(""); }catch(e){} },
    finish: function(suspend){
      if(!connected) return;
      try{
        if(suspend) api.LMSSetValue("cmi.core.exit","suspend");
        api.LMSCommit("");
        api.LMSFinish("");
      }catch(e){}
      connected=false;
    }
  };
})();
