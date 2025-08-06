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

// Outline
const _ZipColor = "var(--denim)";
const _ImgColor = "var(--dandelion)";
const _EpubColor = "var(--fruit-salad)";
// Background
const _ZipBackgroundColor = "var(--columbia-blue)";
const _ImgBackgroundColor = "var(--vanilla)";
const _EpubBackgroundColor = "var(--tea-green)";

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
        inputFileList.sort(SortAlphaNum); // [@SortInitialInput]
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
        inputFileList.sort(SortAlphaNum); // [@SortInitialInput]
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
	const sampleImgSet = [ {number : -1, count : 0, type: 0}, [  ] ];
	let imgList = [];
	
	let baseDirName = "";

	if(isNewFile){
		$('#zipInfoBox').append(`<div class="ZipInfoWrap">`);
	};

	// if zip, recursively unzip them
	for(let i = 0; i < inputFileList_.length; i++){
		let file = inputFileList_[i];
		let fileType = CheckFileType(file.name);

		if(fileType === "zip"){
			DisplayFileInfo(file.name, fileType, number); // Zips must shown first time. The zips are already sorted: [@SortInitialInput], [@SortForZippedZips]

			$("#status").text("Decompressing Zip File.."); //"파일 압축을 해제하는 중.."
			let unzippedFiles = await UnzipFile(file);
			if(!UnzipAbortController.signal.aborted){
				$("#status").text("Sorting Files...");
				unzippedFiles.sort(SortAlphaNum); // [@SortForZippedZips]
				$("#status").text("Loading File Info.."); //"파일 정보를 불러오는 중.."
				await GetFileInfo(unzippedFiles, false);//recurse
			};
		}
	};

	// sort files
	$("#status").text("Sorting Files...");
	inputFileList_.sort(SortAlphaNum);

	// display sorted files
	$("#status").text("Displaying Files...");
	for(let i = 0; i < inputFileList_.length; i++){
		let file = inputFileList_[i];
		let fileType = CheckFileType(file.name);

		if(fileType === "img"){
			imgInfo = await GetImgInfo(file);
			imgList.push(imgInfo);}

		else if(fileType === "zip"){
			// do nothing here. NOT else
		}

		else if(fileType === "epub"){
			imgSetList.push(GetEpubSet(file, number));
			DisplayFileInfo(file.name, fileType, number);

			number++;

		}else if(fileType === "dir"){
			let dirName = file.name.substring(0, file.name.lastIndexOf('/'));

			//display imglist in front of this directory in zip.
			if(baseDirName != dirName && imgList.length > 0){
				imgSetList.push(GetImgSet(imgList, number, 3));
				let sampleDirName = imgList[0].name.substring(0, imgList[0].name.lastIndexOf('/')); //different from dirName(previous dir)
				imgList = [];

				DisplayFileInfo(sampleDirName, "dir", number);

				number++;

				baseDirName = dirName;
			};

		}else{
			DisplayFileInfo(file.name, fileType, number);
		}
	}


	if(baseDirName != ""){
		let dirName = imgList[0].name.substring(0, imgList[0].name.lastIndexOf('/'));
		imgSetList.push(GetImgSet(imgList, number, 3));

		DisplayFileInfo(dirName, "dir", number);
		imgList = [];
		//number++??????????
		baseDirName = "";

	}else if(imgList.length > 0){
		imgSetList.push(GetImgSet(imgList, number, 0));
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

function GetImgSet(imgList, number, fileType){ // fileType - 0 : img, 3: dir
	const sampleImgSet = [ { number : -1, count : 0, type: fileType }, [ ] ];

	let newImgSet = sampleImgSet;
	newImgSet[0].number = number;
	newImgSet[0].count = imgList.length;
	newImgSet[1] = imgList;

	return newImgSet;
}
function GetEpubSet(epubFile, number){ //temp function. I need to use class.
	const sampleEpubSet = [ { number : -1, count: 0, type: 2 }, [ ] ];
	
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
		/*
		if(aName[aName.length-1] == "\n") return -1;
		if(bName[bName.length-1] == "\n") return 1;

		return SortAlphaNum_(aName, bName);
		*/
	}else{
	    return SortAlphaNum_(aName, bName);
	}
}

function SortAlphaNum_(a, b){
	const seperator = /([가-힣a-zA-Z]+|\d+|[-.])/g;

	const aSep = a.match(seperator);
	const bSep = b.match(seperator);

	let aPart;	let aCode;
	let bPart;	let bCode;
	let aCursor = 0;
	let bCursor = 0;

	while(aCursor < aSep.length && bCursor < bSep.length){
		aPart = aSep[aCursor];	
		aCode = aPart[0].charCodeAt(0);
		bPart = bSep[bCursor];	
		bCode = bPart[0].charCodeAt(0);
		
		if(48 <= aCode && aCode <= 57) aPart = parseInt(aPart); // Convert to int to remove front '0'
		if(48 <= bCode && bCode <= 57) bPart = parseInt(bPart);

		if(aPart === bPart){
			aCursor++;
			bCursor++;
			continue;
		}
		else if(bPart === '-' || bPart === '.'){ // bPart first -> '-' < '.'
            return -1;
        }
        else if(aPart === '-' || aPart === '.'){
            return 1;
        }
		else return aPart > bPart ? 1 : -1;
	}

	return -1;
}

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