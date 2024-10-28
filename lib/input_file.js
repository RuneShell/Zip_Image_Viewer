/*
* File: input_file.js
* Author: HleeJ
*       dlhj09@naver.com
*       https://github.com/RuneShell
* Locate: in Personal-Project 2: ZIV
* 2024-10
* ----------------------------------
* Brief: Get files, unzip zip and get inner files
*/

/****************************** Global Variables ******************************/
//already defined in "main_event.js"
//const _URL = window.URL || window.webkitURL;

//MAIN DATABASE
let imgSetList = [];

//zip entry name encoding
var selectedEncoding = "euc-kr";

const zipFunctions = (() => {
    return {
        getEntries(file, options) {
            return new zip.ZipReader(new zip.BlobReader(file)).getEntries(options); //returns Promise
        },
        async getData(entry, options){
            return await entry.getData(new zip.BlobWriter(), options); //returns Promise
        }
    }
})();
const UnzipAbortController = new AbortController();


const _ZipColor = "var(--denim)";
const _ImgColor = "var(--dandelion)";
const _EpubColor = "var(--fruit-salad)";

const _InputBoxWidth = "var(--inputbox-width)";


/****************************** Main Events  ******************************/
$(document).ready(async function(){

    // Activate InputBox


    // Select File (click)
    $("#selectFileButton").click(function(){
        $("#selectFile").click();
    });
    $("#selectFile").change(function(){
        //fileList.push(newFileListSet);	
        let inputFileList = Array.prototype.slice.call(this.files);
        inputFileList.sort(SortAlphaNum);
        RefreshFileSet(inputFileList);
    })
    // Select File (Drag & Drop)
    $("#sideNavigation").on('dragover', function(e){
        e.preventDefault();
        e.stopPropagation();
        ActivateInputBox();
    });
    $("#selectFileButton").on('dragover', function(e){
        e.preventDefault();
        e.stopPropagation();
        ActivateInputBox();
    });
    $("#selectFileButton").on('drop', function(e){
        e.preventDefault();
        DisableInputBox();        

        //fileList.push(newFileListSet);
        let files = e.originalEvent.dataTransfer.files;
        let inputFileList = Array.from(files);
        inputFileList.sort(SortAlphaNum);
        RefreshFileSet(inputFileList);
    });

/*disabled
    $("#encoding").change(function(){
        selectedEncoding = $("#encoding option:selected").val(); 
        $("#zipInfoBox").html("");
	if(isImgSetListLoaded) {
		RefreshFileSet(inputFileList);
	};
    });
*/
});


/****************************** Core Functions  ******************************/

async function RefreshFileSet(inputFileList_){
	$("#status").text("Loading File Info.."); //"파일 정보를 불러오는 중.."
	$("#status").css("color", "red");
	await GetFileInfo(inputFileList_, true);
	if(imgSetList.length > 1){
		$("#status").text(`${imgSetList.length} Files Loaded.`); //"작업 완료"
	}else{
		$("#status").text(`${imgSetList.length} File Loaded.`); //"작업 완료"
	};
	$("#status").css("color", "var(--pink-lady)");
};

//Get fileList and display by fileType. If it is zip, unzip and recurse.
async function GetFileInfo(inputFileList_, isNewFile){
	let number = imgSetList.length;
	const sampleImgSet = [ {number : -1, count : 0}, [  ] ];
	let imgList = [];
	
	let baseDirName = "";

	if(isNewFile){
		$('#zipInfoBox').append(`<div class="ZipInfoWrap">`);
	};

	for(let i = 0; i < inputFileList_.length; i++){
		let file = inputFileList_[i];
		let fileType = CheckFileType(file.name);

//console.log(file);
		if(fileType === "img"){
			imgInfo = await GetImgInfo(file);
			imgList.push(imgInfo);

		}else if(fileType === "zip"){
			 DisplayFileInfo(file.name, fileType, number);

			$("#status").text("Decompressing Zip File.."); //"파일 압축을 해제하는 중.."
			let unzippedFiles = await UnzipFile(file);
			if(!UnzipAbortController.signal.aborted){
				unzippedFiles.sort(SortAlphaNum); //Sometimes there is unsorted file.
				$("#status").text("Loading File Info.."); //"파일 정보를 불러오는 중.."
				await GetFileInfo(unzippedFiles, false);//recurse
			};

		}else if(fileType === "epub"){

			imgSetList.push(GetEpubSet(file, number));
			DisplayFileInfo(file.name, fileType, number);

			number++;


		}else if(fileType === "dir"){
			let dirName = file.name.substring(0, file.name.lastIndexOf('/'));

			//display imglist in front of this directory in zip.
			if(baseDirName != dirName && imgList.length > 0){
				imgSetList.push(GetImgSet(imgList, number));
				let sampleDirName = imgList[0].name.substring(0, imgList[0].name.lastIndexOf('/')); //different from dirName(previous dir)
	
				DisplayFileInfo(sampleDirName, "dir", number);
				imgList = [];

				number++;

				baseDirName = dirName;
			};
		}else{
			DisplayFileInfo(file.name, fileType, number);
		};
	};

	if(baseDirName != ""){
		let dirName = imgList[0].name.substring(0, imgList[0].name.lastIndexOf('/'));
		imgSetList.push(GetImgSet(imgList, number));

		DisplayFileInfo(dirName, "dir", number);
		imgList = [];
		//number++??????????
		baseDirName = "";

	}else if(imgList.length > 0){
		imgSetList.push(GetImgSet(imgList, number));
		DisplayFileInfo(imgList[0].name, "img", number);
		imgList = [];
	};

	if(isNewFile){
		$('#zipInfoBox').append(`</div>`);
	};
};

function DisplayFileInfo(fileName, fileType, number){
	let fileCode;
	let fileBorderColor = "white";	// it can be better to use css..
	let index;
	let imgCount;
    switch(fileType){
        case "img":
            fileCode = 0;
	fileBorderColor = _ImgColor;
	index = number;
            if (index != -1){
                imgCount = imgSetList[index][0].count;
                if (imgCount > 1){
                    fileName += " ...";
                }
            }
            break;

        case "zip":
            fileCode = 1;
	fileBorderColor = _ZipColor;
            break;

       case "epub":
            fileCode = 2;
	fileBorderColor = _EpubColor;
            break;

        case "dir":
            fileCode = 3;
	fileBorderColor = _ImgColor;
	index = number;
	if(index != -1){
		imgCount = imgSetList[index][0].count;
	}
            break;

        default:
            fileCode = 999;
    }

    let newLine = "";
    newLine += `<div class="FileList" id="fileList:${fileCode}:${number}" style="border: 1px solid ${fileBorderColor}">`;
    newLine += `<span class="FileListType">${fileType}</span><span class="FileListDivider">|</span>`;
    newLine += `<span class="FileListTitle">${fileName}</span>`;	
	if(fileType == "img" || fileType == "dir"){
		newLine += `<div class="FileListPageWrap Hidden-Letters"><span class="FileListDivider">|</span><span class="FileListType">${imgCount}</span></div>`;
	};
    newLine += `</div>`;

    $('.ZipInfoWrap').last().append(newLine); //fileList:fileCode:number
};


/****************************** Helper Functions  ******************************/

async function UnzipFile(zipFile){
	const entries = await zipFunctions.getEntries(zipFile, { filenameEncoding : selectedEncoding
		/*, onprogress: (progress, total, entry) => {
		console.log("unzipping:", progress, total, entry); 
		}*/ 
	});
	let entries2files;

	// Check if zip file need password
	entries2files = await TryDecryptEntries(entries, null);
	while(!entries2files){
		$("#status").text("Enter Password"); //비밀번호를 입력해 주세요.
		let passwordInput = prompt(`${zipFile.name}`, "password");
		if(!passwordInput){
			UnzipAbortController.abort();
			console.log("unzipfile-password-prompt aborted");
			return;
		};
		entries2files = await TryDecryptEntries(entries, passwordInput);
		if(!entries2files){ alert("Wrong Password"); };
	};

	return entries2files;
};
async function TryDecryptEntries(entries, password){
	let entries2files = [];
	let options = {};
	if(password){
		options = {
			password: password
			/*
			onprogress: (index, max) => {
				unzipProgress.value = index;
				unzipProgress.max = max;
			},
			signal
			checkSignature: true,
			preventClose: true,
			transferStreams: true,
			useCompressionStream: true,
			useWebWorkers: true
			*/
		};
	};

	try{
		for(let i = 0; i < entries.length;i++){
			const entry = entries[i];
			//console.log(`1entry: ${entry.filename}`);

			let entry2file = await zipFunctions.getData(entry, options);

			/*
			//remove dir source of file
			if(entry.filename[entry.filename.length-1] == "/"){
				entry2file.name = entry.filename;
			}else{
				const entrySplit = entry.filename.split("/");
				entry2file.name = entrySplit[entrySplit.length-1]; //basically, entry.name is 'undefined' so we must allocate it with entry.filename.
			};
			//console.log(`2entry: ${entry.filename}`);
			*/
			entry2file.name = entry.filename;

			entries2files.push(entry2file);
		};
		return entries2files;
	}catch(error){
		return false;
	};
}

function GetFileName(file){
    var fileName;
    try{
        if(typeof file.name != "undefined" && typeof file.name != null){
            fileName = file.name;
        }else if(typeof file.filename != "undefined" && typeof file.filename != null){
            fileName = file.filename;
        }else{
            fileName = "Error in : GetFileName()";
        };
        return fileName;
    }catch(errer){
        alert(error);
    };
};

function CheckFileType(fileName){
    var parts = fileName.split('.');
    var ext =   parts[parts.length - 1];
    switch(ext.toLowerCase()){
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'webp':
            return "img";
        case 'zip':
        case '7z':
            return "zip";
        case 'epub':
            return "epub";
    }
    if (ext[ext.length-1] == "/"){
        return "dir";
    }
    else{
        console.log(`unknown extension: ${ext}`)
        return "unknown";
    }
}

async function GetImgInfo(file){
	//let baseURL = _URL;
//================ need to Promise > async change ======
    return new Promise(function(resolve, reject){
        var $img = $('<img>');
        $img.attr('src', _URL.createObjectURL(file));
        $img.on('load', function(){

            //+++++ Analysis +++++: this와 file정보추출 check (in zip/img)
            //결론: 
            //name - zip: entry.filename; / img: file.name;
            //size - zip: entry.uncompressedsize; /img: file.size;
	
	//file size, file resolution disabled.
            //var imgInfo = { name : fileName, file : file, size : file.size, width : this.width, height : this.height };
	let imgInfo = { name : file.name, file: file, width : this.width, height : this.height };
            resolve(imgInfo); //이게 load 밖에 있으면 작동하지 않음
        });
        
    });
};

function GetImgSet(imgList, number){
	const sampleImgSet = [ { number : -1, count : 0 }, [ ] ];

	let newImgSet = sampleImgSet;
	newImgSet[0].number = number;
	newImgSet[0].count = imgList.length;
	newImgSet[1] = imgList;

	return newImgSet;
}
function GetEpubSet(epubFile, number){ //temp function. I need to use class.
	const sampleEpubSet = [ { number : -1, count: 0 }, [ ] ];
	
	let newEpubSet = sampleEpubSet;
	newEpubSet[0].number = number;
	newEpubSet[0].count = 1;
	newEpubSet[1] = epubFile;

	return newEpubSet;
}

//sort_algorithm: alphanum-sort
//-1not swap 1swap
function SortAlphaNum(a, b){
	let aName = a.name;
	let bName = b.name;
	if(aName.includes('/')){
	    let aNameSplit = aName.split('/');
	    let bNameSplit = bName.split('/');

    	for(let i = 0; i < aNameSplit.length; i++){
	    	let aNamePart = aNameSplit[i];
	    	let bNamePart = bNameSplit[i];
	
	    	//1 Check if Dir
	    	if(aNamePart=="" && (i+1 == aNameSplit.length)){
	    		return -1;
	    	};
	    	if(bNamePart=="" && (i+1 == bNameSplit.length)){
	    		return 1;
	    	};
		
	    	//2 Compare Parts
	    	let result = SortAlphaNum_(aNamePart, bNamePart);
	    	if(result != 0){
	    		return result;
	    	};
    	};
	}else{
	    return SortAlphaNum_(aName, bName);
	}
}
function SortAlphaNum_(a, b){
        if(a === b){
            return 0;
        }
    
        let reA = /[^a-zA-Z]/g;
        let reN = /[^0-9]/g;
console.log(a, b);
        let aA = a.replace(reA, "");
        let bA = b.replace(reA, "");
        if (aA === bA) {
          let aN = parseInt(a.replace(reN, ""), 10);
          let bN = parseInt(b.replace(reN, ""), 10);
          return aN === bN ? 0 : aN > bN ? 1 : -1;
        } else {
          return aA > bA ? 1 : -1;
        }
};


/****************************** CSS Functions  ******************************/

function ActivateInputBox(){
        $("#selectFileButton").css("width", "375px");
        $("#selectFileButton").css("transition", "0.1s ease");
        $("#inputBoxInner").css("display", "flex");
}
function DisableInputBox(){
        $("#selectFileButton").css("width", _InputBoxWidth);
        //$("#selectFileButton").css("transition", "0.1s ease");
        $("#inputBoxInner").css("display", "none");
}