(() => {
  // lib/HTMLVanilla.ts
  var HTMLVanillaObject = class {
    // Freeze the object to prevent further modifications
    isFrozen = false;
    freeze() {
      this.isFrozen = true;
    }
    unfreeze() {
      this.isFrozen = false;
    }
  };
  var Application = class _Application extends HTMLVanillaObject {
    // Singleton Pattern
    static instance;
    constructor() {
      super();
    }
    // prevents new() from being called on this class
    static getInstance() {
      if (!_Application.instance) _Application.instance = new _Application();
      return _Application.instance;
    }
    // Fullscreen
    fullscreen = false;
    async toggleFullscreen() {
      this.freeze();
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        this.fullscreen = false;
      } else {
        await document.documentElement.requestFullscreen();
        this.fullscreen = true;
      }
      this.unfreeze();
    }
  };
  var application = Application.getInstance();
  var LeftSidebar = class _LeftSidebar extends HTMLVanillaObject {
    // Singleton Pattern
    static instance;
    constructor() {
      super();
    }
    // prevents new() from being called on this class
    static getInstance() {
      if (!_LeftSidebar.instance) _LeftSidebar.instance = new _LeftSidebar();
      return _LeftSidebar.instance;
    }
  };
  var leftSidebar = LeftSidebar.getInstance();
  var RightSidebar = class _RightSidebar extends HTMLVanillaObject {
    // Singleton Pattern
    static instance;
    constructor() {
      super();
    }
    // prevents new() from being called on this class
    static getInstance() {
      if (!_RightSidebar.instance) _RightSidebar.instance = new _RightSidebar();
      return _RightSidebar.instance;
    }
    // 함수들 넣기. 이게 여기있으ㅕㅁㄴ 안 된./
    // return (<div id="sideNavigation" onDragOver={handleDragOver}>
    //     <input ref={fileInputRef} id="selectFile" type="file" multiple hidden onChange={handleFileChange}/>
    //     <button id="selectFileButton" type="button" onClick={handleSelectFileClick} onDragOver={handleDragOver} onDrop={handleDrop}>Select File</button>
    //     </div>
    // );
  };
  var rightSidebar = RightSidebar.getInstance();

  // lib/eventListener.ts
  var SetFullscreenCommand = class {
    constructor(application2) {
      this.application = application2;
    }
    application;
    execute() {
      this.application.toggleFullscreen();
    }
  };
  var commands = {
    setFullscreen: new SetFullscreenCommand(application)
  };
  var keyToAction = {
    KeyF: () => commands.setFullscreen.execute()
  };
  document.addEventListener("keydown", (e) => {
    console.log(`Key pressed: ${e.code}`);
    keyToAction[e.code]?.();
  });
})();
