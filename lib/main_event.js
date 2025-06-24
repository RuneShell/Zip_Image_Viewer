/*
* File: main_event.js
* Author: RuneShell
*       dlhj09@naver.com
*       https://github.com/RuneShell
* Locate: in Personal-Project 2: ZIV
* 2024-10
* ----------------------------------
* Brief: Handle all events
*/

/****************************** Global Variables ******************************/

const _URL = window.URL || window.webkitURL;

//flags
var isImgSetListLoaded = false; //is imgSetList loaded
var isAddFittingPage = false; //option in mode "vertical_double"
var isReverseView = false; //option in mode "vertical_double"

//.PageBox items
var clickedElement; //using GetElementById() (jQuery Error?) 
var clickedElement_double;

//Image Display
const bookDisplayModes = ["none", "img", "epub"];
let bookDisplayMode = bookDisplayModes[0]; //init_value

const imgDisplayModes = ["vertical_single", "vertical_double", "horizontal", "scroll"];
var imgDisplayMode = imgDisplayModes[0]; //init_value
const epubDisplayRenditionMode = [{flow: "paginated", spread: "none", width: "768px", height: "100vh"},
                                {flow: "paginated", spread: "always", width: "1536px", height: "100vh"},
                                {/* later... */},
                                {flow: "scrolled", spread: "auto", width: "1536px", height: "100vh"}
];

//Epub Display
let book;
let rendition;
const epubDefaultLocationUnit = 1200
const epubDefaultFontSize = 16

//CSS color
const _SelectedPageBackgroundColor = "var(--raffia)";
const _DeselectedPageBackgroundColor = "var(--pink-lady)"; //equal to transparent, parent element

//Audio
//const _TurnPageAudio = new Audio("resource/");

// Error Message
function _ERRRenditionUndefined(){ console.log("Rendition is undifiend"); }; // First Error msg is ok.

/****************************** Input Events ******************************/
//key events
document.addEventListener('keydown', (event) => {
    console.log("==Key down==", event.code);
    switch(event.code){

        // Go to next/previous image
        case "ArrowLeft":
            (!isReverseView) ? PreviousImage() : NextImage(); break; // When revese-view, Arrow means reversed
        case "ArrowRight":
            (!isReverseView) ? NextImage() : PreviousImage(); break;
        case "Space":
            NextImage(); break;


        // Button Shortcuts
        case "KeyF":
            FullScreen(); break;
        case "KeyV":
            imgDisplayMode = imgDisplayModes[0];
            BookDisplayChange(bookDisplayMode, imgDisplayMode); break;
        case "KeyD":
            imgDisplayMode = imgDisplayModes[1];
            BookDisplayChange(bookDisplayMode, imgDisplayMode); break;
        case "KeyH":
            imgDisplayMode = imgDisplayModes[2];
            BookDisplayChange(bookDisplayMode, imgDisplayMode); break;
        case "KeyS":
            imgDisplayMode = imgDisplayModes[3];
            BookDisplayChange(bookDisplayMode, imgDisplayMode); break;

        // HTML checkbox
        case "KeyA":
            checkBoxVerticalDouble_display = window.getComputedStyle(document.getElementById("checkbox-vertical_double")).display;
            if(isImgSetListLoaded && (checkBoxVerticalDouble_display != "none")){
                addFittingPageOption = document.getElementById("add-fitting-page");
                addFittingPageOption.checked = (!addFittingPageOption.checked);
                ToggleAddFittingPage();
            } break;
        case "KeyR":
            checkBoxVerticalDouble_display = window.getComputedStyle(document.getElementById("checkbox-vertical_double")).display;
            console.log(isImgSetListLoaded, checkBoxVerticalDouble_display);
            if(isImgSetListLoaded && (checkBoxVerticalDouble_display != "none")){
                reverseViewOption = document.getElementById("reverse-view");
                reverseViewOption.checked = (!reverseViewOption.checked);
                ReverseView();
            } break;
            
                
    }

});
document.addEventListener("wheel", (event) => {
    let wheelThreshold = 130;
    for(let i = 0; i < (Math.abs(event.deltaY)/wheelThreshold); i++){
        event.deltaY>0 ? NextImage() : PreviousImage();
    }
});


/****************************** Main Events  ******************************/
$(document).ready(function(){
    InitPage();

    $(document).on("click", ".FileList", async function(e){ //using $(".FileList") -> error
        let elementId = $(this).attr('id').split(":");
	    if(elementId[1] == 0 || elementId[1]== 3){ //img || dir
            ShowImgData(elementId[2]);
        }else if(elementId[1] == 2){ //epub
            await ShowEpubData(elementId[2]).then((r)=>{rendition = r}); // First time, no rendition.
        }
    });
    $(document).on("click", ".Page", function(e){
		let elementId = $(this).attr('id');
		let elementId_ = elementId.split(":");
		if(elementId_[0] == "imgSetList"){
			//if display mode is single page
			if(imgDisplayMode == imgDisplayModes[0] || imgDisplayMode == imgDisplayModes[2]){
				ChangeImgPreview(elementId);
			}
			//if display mode is double page
			else if(imgDisplayMode == imgDisplayModes[1]){
				ChangeImgPreview_double(elementId);
			}
			//if display mode is scroll
			else if(imgDisplayMode == imgDisplayModes[3]){
				alert("We do not support this feature in Scroll mode.");
			}
		}else if(elementId_[0] == "epubSetList"){
			//중복. 모듈화 필요
			if(imgDisplayMode == imgDisplayModes[0] || imgDisplayMode == imgDisplayModes[2]){
				ChangeEpubPreview();
			}else if(imgDisplayMode == imgDisplayModes[1]){
				ChangeEpubPreview_double();
			}else if(imgDisplayMode == imgDisplayModes[3]){
				ChangeEpubScroll();
			};
            //console.log(rendition.currentLocation());
			//position fixed (below)
            
            let isRendered = false;
            rendition.display(elementId_[2]).then(()=>{ // display page with href // display() -> "rendered"
                rendition.on("rendered", ()=>{
                    if(!isRendered){ // It automatically re-Render multiple times, I dont know why.
                        isRendered = true;
                        ChangeProgress();
                    }
                });
            }); 
		};
    })

    //HTML-buttons
    $("#prevArrow").on("click", function(){
        (!isReverseView) ? PreviousImage() : NextImage();
    })
    $("#nextArrow").on("click", function(){
        (isReverseView) ? NextImage() : PreviousImage();
    })

    $("#vertical").on("click", function(){
        imgDisplayMode = imgDisplayModes[0];
        BookDisplayChange(bookDisplayMode, imgDisplayMode);
    })
    $("#vertical_double").on("click", function(){
        imgDisplayMode = imgDisplayModes[1];
        BookDisplayChange(bookDisplayMode, imgDisplayMode);
    })
    $("#horizontal").on("click", function(){
        imgDisplayMode = imgDisplayModes[2];
        BookDisplayChange(bookDisplayMode, imgDisplayMode);
    })
    $("#scroll").on("click", function(){
        imgDisplayMode = imgDisplayModes[3];
        BookDisplayChange(bookDisplayMode, imgDisplayMode);
    })
    $("#fullscreen").on("click", async function(){
        await FullScreen();
        BookDisplayChange(bookDisplayMode, imgDisplayMode);
    });

    //HTML-checkboxs
    $("#add-fitting-page").on("click", function(){
        ToggleAddFittingPage();
    })
    $("#reverse-view").on("click", function(){
        ReverseView();
    })


    $("#imgPreview").on("click", function(){
            if(imgDisplayMode == imgDisplayModes[1]){
                PreviousImage();
            };
    })
    $("#imgPreview_double").on("click", function(){
        NextImage();
    })	

    let isModalOpen = false;
    const modalPage = document.getElementById("modal");
    // Modal: INFORMATION
    $("#openModal").on("click", function(){
        if(isModalOpen == false){
            modalPage.style.display = "flex";
            isModalOpen = true;
        } else{
            modalPage.style.display = "none";
            isModalOpen = false;
        }
    })
    $("#modal").on("click", function(){
        if(isModalOpen){
            modalPage.style.display = "none";
            isModalOpen = false;
        }
    })


	// Option: epub
	$("#epubOptionItem_fontSize_range").mouseup(function(){
		ChangeEpubFont(Number(this.value));
	});
	$(".Epub-Option-Item-BackgroundColorBox").click(function(e){
		let clickedBox = $(e.currentTarget);

		$(".Epub-Option-Item-BackgroundColorBox").addClass("Hidden-Letters");
		$(".Epub-Option-Item-BackgroundColorBox").css({"border" : "0"});
		clickedBox.removeClass("Hidden-Letters");
		clickedBox.css({"border": "1px solid var(--porcelain)"});

		rendition.on("rendered", ()=>{   
			const newColor = clickedBox.css("background-color");
			$("#epubBox").css({"background-color": newColor});
		});
	});


/*
    //debugging
    $("#test").on("click", function(){
        console.log(clickedElement.id);
    })
*/
})


/****************************** Side Functions  ******************************/

function InitPage(){
    imgDisplayMode = imgDisplayModes[0];
    BookDisplayChange(bookDisplayMode, imgDisplayMode);
}
function FullScreen(){
	/*if(imgDisplayMode === imgDisplayModes[3]){
		alert("We do not support this feature in Scroll mode.");
	}else{*/
		if(document.fullscreenElement){
			document.exitFullscreen();
		}else{
			document.documentElement.requestFullscreen()
		}
	/*}*/
}

function ToggleAddFittingPage(){
    isAddFittingPage = document.getElementById("add-fitting-page").checked;
    BookDisplayChange(bookDisplayMode, imgDisplayMode);
}
function ReverseView(){
    isReverseView = document.getElementById("reverse-view").checked;
    BookDisplayChange(bookDisplayMode, imgDisplayMode);
}

function InitEpubThemes(){
    if(rendition){
        ChangeEpubFont(epubDefaultFontSize);
        rendition.themes.default({
            "img.illustration": {
                "max-width":  "700px !important",
                "max-height": "95vh !important"
            }
        })
    }
}
function ChangeEpubFont(newFontSize){
    $("#epubOptionItem_fontSize_text").text(String(newFontSize) + "px");
    if(rendition){    
        rendition.themes.default({
            ".title": {
                "font-size": String(newFontSize+14) + "px !important"
            },
            ".content": {
                "font-size": String(newFontSize) + "px !important"
            },
            "rt.content": {
                "font-size": String(newFontSize-5) + "px !important"
            }

        });
    }
}

/****************************** Main Functions  ******************************/

function ShowImgData(imgSetIndex_){
// width limitation 및 design 이슈로 Size, No., widxhei 는 생략한다.
	bookDisplayMode = bookDisplayModes[1];
	BookDisplayChange(bookDisplayMode, imgDisplayMode);

	isImgSetListLoaded = true;
	ClearPageBox();
    
	let imgSet = imgSetList[imgSetIndex_];
	let imgInfos = imgSet[1];
	let newLine;


    $("#countNum").text(imgInfos.length);

    for(var i = 0;i < imgInfos.length;i++){
        var imgInfo = imgInfos[i];
        //var fileSize = `${(imgInfo.size/1024).toFixed(2)}kb`;
        //var WidxHei = `${imgInfo.width}x${imgInfo.height}`;

        //newLine = `<tr class="ImgSetList" id="imgSetList:${imgSetIndex_}:${i+1}"><td>${i+1}</td><td>${imgInfo.name}</td><td>${fileSize}</td><td>${WidxHei}</td></tr>`;
        newLine = `<div class="Page imgPage" id="imgSetList:${imgSetIndex_}:${i+1}"><span class="PageElement">${imgInfo.name}</span></div>`;
        $("#pageBox").append(newLine);
     };

    //show single-page
    if(imgDisplayMode == imgDisplayModes[0] || imgDisplayMode == imgDisplayModes[2]){
        ChangeImgPreview(`imgSetList:${imgSetIndex_}:1`);
    }
    //show double-page
    else if(imgDisplayMode == imgDisplayModes[1]){
        ChangeImgPreview_double(`imgSetList:${imgSetIndex_}:1`);
    }
    //show scroll
    else if(imgDisplayMode == imgDisplayModes[3]){
        ChangeImgScroll(`imgSetList:${imgSetIndex_}:1`);
    };
};

async function ShowEpubData(bookSetIndex_){ // epub rendering init부분이 많아서 따로 분리해도 될듯.
    console.log("ShowEpubData", bookSetIndex_);
    if(rendition){ rendition.destroy(); };
    bookDisplayMode = bookDisplayModes[2]; // epub
    BookDisplayChange(bookDisplayMode, imgDisplayMode);
    
    isImgSetLoaded = true;
    ClearPageBox();

    let bookSet = imgSetList[bookSetIndex_];
    let epubFile = bookSet[1];
    let newLine;
    
    book = ePub();
    const buffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(epubFile);
    });

    await book.open(buffer, "binary");
    await book.ready;

    const key = book.key()+'-locations';
    const stored = localStorage.getItem(key);
    if (stored) {
        await book.locations.load(stored);
    } else {
        // Or generate the locations on the fly
        // Can pass an option number of chars to break sections by
        await book.locations.generate(epubDefaultLocationUnit);
    }

    rendition = book.renderTo("epubBox", epubDisplayRenditionMode[imgDisplayModes.indexOf(imgDisplayMode)]); // default: single page view
    InitEpubThemes();
    rendition.display();

    rendition.on("started", function(){
        const toc = book.navigation.get();
        toc.forEach((item, i)=>{
            const title_ = item.label;
            const title = title_.substr(9, title_.length-16);
            const href = item.href;

            newLine = `<div class="Page epubPages" id="epubSetList:${bookSetIndex_}:${href}"><span class="PageElement">${title}</span></div>`;
            $("#pageBox").append(newLine);
        });
    });

    let isRendered = false;
    await new Promise(resolve => {
        rendition.on("rendered", () => { // display() -> "rendered"
            if(!isRendered){
                isRendered = true;
                resolve();
            }
        });
    });
    return rendition;
};

//go to previous / next image
function PreviousImage(){
    //_TurnPageAudio.currentTime = 0;
    //_TurnPageAudio.play();

    if (isImgSetListLoaded && (clickedElement != undefined)){
        var clickedElementId = clickedElement.id.split(":");
        //check lower limit(regardless of single/double-page)
        if (Number(clickedElementId[2]) <= 1){ // 0(add-fitting) or 1(first image)
            return;
        }
        //if display mode is single-page
        if(imgDisplayMode == imgDisplayModes[0] || imgDisplayMode == imgDisplayModes[2]){
            ChangeImgPreview(`${clickedElementId[0]}:${clickedElementId[1]}:${Number(clickedElementId[2]) - 1}`);
        } 
        //if display mode is double-page
        else if(imgDisplayMode == imgDisplayModes[1]){
            ChangeImgPreview_double(`${clickedElementId[0]}:${clickedElementId[1]}:${Number(clickedElementId[2]) - 2}`);
        }
        //if display mode is scroll
        else if(imgDisplayMode == imgDisplayModes[3]){
            alert("We do not support this feature in Scroll mode.");
        }

    }
    
    if(rendition){
        rendition.prev();
        ChangeProgress();
    }

    return;
}
function NextImage(pageTurnInDoubleMode){
    //_TurnPageAudio.currentTime = 0;
    //_TurnPageAudio.play();

    if (isImgSetListLoaded && (clickedElement != undefined)){
        var clickedElementId = clickedElement.id.split(":");

        //if display mode is single-page
        if(imgDisplayMode == imgDisplayModes[0] || imgDisplayMode == imgDisplayModes[2]){
            //check upper limit
            if (clickedElementId[2] == imgSetList[Number(clickedElementId[1])][1].length){
                return;
            }
            ChangeImgPreview(`${clickedElementId[0]}:${clickedElementId[1]}:${Number(clickedElementId[2]) + 1}`);
        }

        //if display mode is double-page
        else if(imgDisplayMode == imgDisplayModes[1]){
            //check upper limit
            //console.log(`nextImage()-now id:${clickedElementId[2]}`);
            if(!(isReverseView)){
                if (clickedElementId[2] >= imgSetList[Number(clickedElementId[1])][1].length-1){
                    return;
                }
            } else{
                if(clickedElementId[2] >= imgSetList[Number(clickedElementId[1])][1].length){
                    return;
                }
            }
            ChangeImgPreview_double(`${clickedElementId[0]}:${clickedElementId[1]}:${Number(clickedElementId[2]) + 2}`);
        }

        //if display mode is Scroll
        else if(imgDisplayMode == imgDisplayModes[3]){
        	alert("We do not support this feature in Scroll mode.");
        }

    }

    if(rendition){
	    rendition.next();
	    ChangeProgress();
    }

    return;
}


function BookDisplayChange(bookDisplayMode, imgDisplayMode){
	console.log("BookDisplayChange");

	$(document).ready(()=>{
		if(bookDisplayMode ===bookDisplayModes[0]){ //"none"
			if(rendition){ rendition.destroy(); };
			$("#epubOptionWrap").css({"display": "none"});
			//
		}else if(bookDisplayMode ===bookDisplayModes[1]){ //"img"
			if(rendition){ rendition.destroy(); };
			$("#epubOptionWrap").css({"display": "none"});
			ImgDisplayChange(imgDisplayMode);
		}else if(bookDisplayMode ===bookDisplayModes[2]){ //"epub"
			$("#epubOptionWrap").css({"display": "block"});
			$("#imgPreview").css({"display": "none"});
			$("#imgPreview_double").css({"display": "none"});
			$("#imgScrollBox").css({"display": "none"});

			if(imgDisplayMode == imgDisplayModes[0] || imgDisplayMode == imgDisplayModes[2]){
				ChangeEpubPreview();
			}else if(imgDisplayMode == imgDisplayModes[1]){
				ChangeEpubPreview_double();
			}else if(imgDisplayMode == imgDisplayModes[3]){
				ChangeEpubScroll();
			};
		};
	});
}
function ImgDisplayChange(imgDisplayMode){
    console.log("ImgDisplayChange()");

    $(document).ready(function(){
        if(imgDisplayMode === imgDisplayModes[0]){
	        $("#imgPreview").css({"display": "block"});
            $("#imgPreview_double").css({"display": "none"});
	        $("#imgScrollBox").css({"display": "none"});
            $("#imgPreview").css({"width": "auto", "height": "100vh", "transform": "none"});
            ShowSinglePage();
            
            isAddFittingPage = false;
            isReverseView = false;
            clickedElement_double = undefined;
            $("#checkbox-vertical_double").css({"display": "none"});
            $("#checkbox-scroll").css({"display": "none"});
        }
        else if(imgDisplayMode === imgDisplayModes[1]){
	        $("#imgPreview").css({"display": "block"});
            $("#imgPreview_double").css({"display": "block"});
	        $("#imgScrollBox").css({"display": "none"});
            $("#imgPreview").css({"width": "auto", "height": "100vh", "transform": "none"});
            ShowDoublePage();
        
            $("#checkbox-vertical_double").css({"display": "flex"});
            $("#checkbox-scroll").css({"display": "none"});
        }
        else if(imgDisplayMode === imgDisplayModes[2]){
            $("#imgPreview").css({"display": "block"});
            $("#imgPreview_double").css({"display": "none"});
            $("#imgScrollBox").css({"display": "none"});
            $("#imgPreview").css({"width": "100vh", "height": "auto"}); //split css edit order to avoid error
            CWidth = document.getElementById("imgPreview").clientWidth;
            CHeight = document.getElementById("imgPreview").clientHeight;
            k = (CHeight - CWidth) / 2;
            k_ = `${k}px`;
            $("#imgPreview").css({"transform": `translatex(-${k_}) translatey(-${k_}) rotate(270deg)`}); //길이를 먼저 바꾼 뒤 이동값 구함

            ShowSinglePage();
                
            isAddFittingPage = false;
            isReverseView = false;
            clickedElement_double = undefined;
            $("#checkbox-vertical_double").css({"display": "none"});
            $("#checkbox-scroll").css({"display": "none"});

            $(window).scrollTop(0);
        }
        else if(imgDisplayMode === imgDisplayModes[3]){
            $("#imgPreview").css({"display": "none"});
            $("#imgPreview_double").css({"display": "none"});
            $("#imgScrollBox").css({"display": "block"});
            //width는 나중에 #checkbox-wrap로 바꿀 수 있음
            //$("#imgPreview").css({"width": "690px", "height": "auto", "display": "block", "margin": "0 auto", "transform": "none"}); //690px 네이버웹툰 기준
            ShowScrollPage(); //*********************************

            isAddFittingPage = false;
            isReverseView = false;
            clickedElement_double = undefined;
            $("#checkbox-vertical_double").css({"display": "none"});
            $("#checkbox-scroll").css({"display": "block"});
        }
    });
}
//Show single / double page view mode
function ShowSinglePage(){
    if (isImgSetListLoaded && (clickedElement != undefined)){
        var clickedElementId = clickedElement.id.split(":");
        //double-page mode에서 isAddFitting에 상관없이 왼쪽 페이지를 보여주는 것으로 함.
        ChangeImgPreview(clickedElement.id);
    }
}
function ShowDoublePage(){
    console.log("ShowDoublePage()");
    if (isImgSetListLoaded && (clickedElement != undefined)){
        var clickedElementId = clickedElement.id.split(":");
        var clickedElementId_now = Number(clickedElementId[2]);

        ChangeImgPreview_double(`${clickedElementId[0]}:${clickedElementId[1]}:${clickedElementId_now}`);//deals with id:0 in ChangeImgPreview_double()
    }
}
function ShowScrollPage(){
    console.log("ShowScrollPage()");
    if (isImgSetListLoaded  && (clickedElement != undefined)){
        var clickedElementId = clickedElement.id.split(":");
        var clickedElementId_now = Number(clickedElementId[2]);

        ChangeImgScroll(`imgSetList:${clickedElementId[1]}:1`);
    }
}


/**change image preview single-page / when left-page id: str is given / NOT deal with add-fitting option*/
function ChangeImgPreview(id){
    var id_split = id.split(":");

    //change .display background bright
    if(clickedElement != undefined){
        clickedElement.style.background = _DeselectedPageBackgroundColor;
    }
    if(clickedElement_double != undefined){
        clickedElement_double.style.background = _DeselectedPageBackgroundColor;
    }
    //set page
    clickedElement = document.getElementById(id);
    //change .display background dark
    clickedElement.style.background = _SelectedPageBackgroundColor;
    //scroll into view imgSetList
    clickedElement.scrollIntoView({ block: "nearest" });

    //show image preview
    ShowImgPreview(Number(id_split[1]), Number(id_split[2])-1); //index -1

}
function ChangeImgPreview_double(id){
    console.log("ChangeImgPreview_double()");
    var id_split = id.split(":");
    idNumber_now = Number(id_split[2]);

    //change .display background bright
    if(clickedElement != undefined){
        clickedElement.style.background = _DeselectedPageBackgroundColor;
    }
    if(clickedElement_double != undefined){
        clickedElement_double.style.background = _DeselectedPageBackgroundColor;
    }

    //option: fitting-page : single -> double page adjust
    // page number: [0(Add fitting)][1, 2, ...], index: [-1(Add fitting)][0, 1, ...]
    if(!isAddFittingPage){ // isAddFittingPage: true -> false
        if(idNumber_now == 0) idNumber_now = 1; // 0(Add fitting) -> 1 // always clickedElement_double(Add-fitted) exist.
        if(idNumber_now%2 == 0){
            // if single page -> double page, adjust to odd number
            if(clickedElement_double == undefined || isReverseView) idNumber_now -= 1; // 2, 4, ... -> 1, 3, ...
            else idNumber_now += 1; // 2, 4, ... -> 3, 4, ...
        }
    }
    else{ // isAddFittingPage: false -> true
        // if single -> double page, adjust to even number
        if(idNumber_now%2 == 1) idNumber_now -= 1; // 1, 3, ... -> 0(Add fitting), 2, ...
        else if(isReverseView) idNumber_now -= 2; // 2, 4, ... -> 0, 2, ...
    }

    //option: reverse-view : set page id to left/right-page
    if(!(isReverseView)){
        var left_pageId = idNumber_now;
        var right_pageId = idNumber_now + 1;
    }
    else{
        var left_pageId = idNumber_now + 1;
        var right_pageId = idNumber_now;
    }

    //set left-page
    console.log(`set left-page: ${id_split[0]}:${id_split[1]}:${left_pageId}`);
    if(left_pageId <= 0){ //not 0, -1
        clickedElement = {id: `${id_split[0]}:${id_split[1]}:0`, style: {background: ""}}; //add-fitting-page id
    }
    else if(left_pageId > imgSetList[Number(id_split[1])][1].length){
        clickedElement = {id: `${id_split[0]}:${id_split[1]}:${imgSetList[Number(id_split[1])][1].length+1}`, style: {background: ""}}; //add-fitting-page id
    }
    else{
        //set page
        clickedElement = document.getElementById(`${id_split[0]}:${id_split[1]}:${left_pageId}`);
        clickedElement.style.background = _SelectedPageBackgroundColor;
    }
    //show image preview
    ShowImgPreview(Number(id_split[1]), left_pageId - 1); //index -1
    
    //set right-page
    console.log(`set right-page: ${id_split[0]}:${id_split[1]}:${right_pageId}`);
    if(right_pageId <= 0){ //not 0, -1
        clickedElement_double = {id: `${id_split[0]}:${id_split[1]}:0`, style: {background: ""}}; //add-fitting-page id
    }
    else if(right_pageId > imgSetList[Number(id_split[1])][1].length){
        clickedElement_double = {id: `${id_split[0]}:${id_split[1]}:${imgSetList[Number(id_split[1])][1].length+1}`, style: {background: ""}}; //add-fitting-page id
    }
    else{
        //set page
        clickedElement_double = document.getElementById(`${id_split[0]}:${id_split[1]}:${right_pageId}`);
        clickedElement_double.style.background = _SelectedPageBackgroundColor;
    }
    //show image preview
    ShowImgPreview_double(Number(id_split[1]), right_pageId - 1); //index -1

    //scroll into view imgSetList
    if(!(isReverseView) && clickedElement.id.split(":")[2] != "0"){
        clickedElement.scrollIntoView({ block: "nearest" });
    } else if(isReverseView && clickedElement_double.id.split(":")[2] != "0" && Number(clickedElement.id.split(":")[2]) <=  imgSetList[Number(id_split[1])][1].length){
        clickedElement_double.scrollIntoView({ block: "nearest" });
    }


}   

function ChangeImgScroll(id){
    var id_split = id.split(":");
    //change .display background bright
    if(clickedElement != undefined){
        clickedElement.style.background = _DeselectedPageBackgroundColor;
    }
    if(clickedElement_double != undefined){
        clickedElement_double.style.background = _DeselectedPageBackgroundColor;
    }
    //set page
    clickedElement = document.getElementById(id);
console.log(clickedElement, id);
    //change .display background dark
    clickedElement.style.background = _SelectedPageBackgroundColor;
    //scroll into view imgSetList
    clickedElement.scrollIntoView({ block: "nearest" });

	ShowImgScroll(id_split[1]);
}

function ChangeEpubPreview(){
    if(rendition){
        rendition.flow(epubDisplayRenditionMode[0].flow);
        rendition.spread(epubDisplayRenditionMode[0].spread);
        rendition.resize(epubDisplayRenditionMode[0].width, epubDisplayRenditionMode[0].height);
    } else {_ERRRenditionUndefined();};
};
function ChangeEpubPreview_double(){
    if(rendition){
        rendition.flow(epubDisplayRenditionMode[1].flow);
        rendition.spread(epubDisplayRenditionMode[1].spread);
        rendition.resize(epubDisplayRenditionMode[1].width, epubDisplayRenditionMode[1].height);
    } else {_ERRRenditionUndefined();};
};
function ChangeEpubScroll(){
    if(rendition){
        rendition.flow(epubDisplayRenditionMode[3].flow);
        rendition.resize(epubDisplayRenditionMode[3].height, epubDisplayRenditionMode[3].height);
    } else {_ERRRenditionUndefined();};
};





/** Show Image Preview / ShowImgPreview(imgSetIndex, imgIndex) */
function ShowImgPreview(imgSetIndex, imgIndex){
    console.log("ShowImgPreview()");
  
    //show image preview
    //if NOT add-fitting page
    console.log(`left page index: ${imgIndex}`);
    //if add-fitting-image
    if(imgIndex == -1){ 
        $("#imgPreview").attr("src", "resource/add-fitting-page.png");
    }
    //if last odd-image
    else if(imgIndex == imgSetList[imgSetIndex][1].length){
        $("#imgPreview").attr("src", "resource/add-fitting-page.png");
    }
    //else
    else{
        var imgSet = imgSetList[imgSetIndex];
        var imgInfos = imgSet[1];
        var imgInfo = imgInfos[imgIndex];
        var file = imgInfo.file;
        $("#imgPreview").attr("src", _URL.createObjectURL(file));
    }
}
function ShowImgPreview_double(imgSetIndex, imgIndex){
    console.log("ShowImgPreview_double()");

    //show image preview
    //if NOT add-fitting page
    console.log(`right page index: ${imgIndex}`);
    //if add-fitting-image
    if(imgIndex == -1){ 
        $("#imgPreview_double").attr("src", "resource/add-fitting-page.png");
    }
    //if last odd-image
    else if(imgIndex == imgSetList[imgSetIndex][1].length){
        $("#imgPreview_double").attr("src", "resource/add-fitting-page.png");
    }
    //else
    else{
        var imgSet = imgSetList[imgSetIndex];
        var imgInfos = imgSet[1];
        var imgInfo = imgInfos[imgIndex];
        var file = imgInfo.file;
        $("#imgPreview_double").attr("src", _URL.createObjectURL(file));
    }
}
function ShowImgScroll(imgSetIndex){
	let imgSet = imgSetList[imgSetIndex];
	let imgInfos = imgSet[1];	

	let DOM_imgScrollBox = document.getElementById("imgScrollBox");
	DOM_imgScrollBox.innerText = "";
	let imgScrollBox_body;
	for(let i = 0; i < imgInfos.length; i++){
		imgScrollBox_body = document.createElement("img");
		imgScrollBox_body.className = "ImgScrollBox_Img";
		imgScrollBox_body.id = `scroll_img:${i}`;
		imgScrollBox_body.src = _URL.createObjectURL(imgInfos[i].file);
		DOM_imgScrollBox.appendChild(imgScrollBox_body);
	};
};             


/****************************** Helper Functions  ******************************/

//Clear Elements
function ClearPageBox(){
    document.getElementById("pageBox").innerHTML = ""; //somewhat crude way
}


function ChangeProgress(){
    console.log("ChangeProgress()");
    let progress = document.getElementById("epubOptionItem_progress");
    let progressText = document.getElementById("epubOptionItem_progress_text");
    if(rendition.currentLocation().start?.cfi){ // 결과적으로는 잘 불러와지지만, 중간 과정에 못찾는 경우가 종종 발생.
        let currentCfi = rendition.currentLocation().start.cfi;
        let percentage = book.locations.percentageFromCfi(currentCfi) * 100;
        
        progress.value = Math.round(percentage);
        progressText.innerText = String(percentage.toFixed(1)) + "%";
    }else{ console.log("loading...");};

}

// epub Display CSS
function SetRenditionCSS(){ // not use
	console.log(rendition.themes);
	if(rendition){    
    rendition.themes.register({
		'div' : {
			'overflow-x': 'hidden'	
		},
		'.epub-container::-webkit-scrollbar' : {
			'width': '20px'	
		},
		'.epub-container::-webkit-scrollbar-thumb' : {
			'background': 'var(--raffia)',
			'border-radius': '10px',
			'background-clip': 'padding-box',	
			'border': '2px solid transparent'
		},

        '.content' : {
            'font-size': '16px !important' // !important to overlap default 
        }
	});
}
else{console.log("no rendition!!");}
}
