zip.workerScriptsPath = "WebContent/";
var files;
var model

function elementInDocument(element) {
    while (element = element.parentNode) {
        if (element == document) {
            return true;
        }
    }
    return false;
}

(function(obj) {

    if (window.addEventListener) {
	window.addEventListener("storage",handle_storage,false);
    } else {
	window.attachEvent("onstorage", handle_storage);
    };
    var requestFileSystem = obj.webkitRequestFileSystem || obj.mozRequestFileSystem || obj.requestFileSystem;
    function onerror(message) {
	alert(message);
    }

    function createTempFile(callback) {
	var tmpFilename = "tmp.dat";
	requestFileSystem(TEMPORARY, 4 * 1024 * 1024 * 1024, function(filesystem) {
	    function create() {
		filesystem.root.getFile(tmpFilename, {
		    create : true
		}, function(zipFile) {
		    callback(zipFile);
		});
	    }

	    filesystem.root.getFile(tmpFilename, null, function(entry) {
		entry.remove(create, create);
	    }, create);
	});
    }

    model = (function() {
	var URL = obj.webkitURL || obj.mozURL || obj.URL;

	return {
	    getEntries : function(file, onend) {
		zip.createReader(new zip.BlobReader(file), function(zipReader) {
		    zipReader.getEntries(onend);
		}, onerror);
	    },
	    getEntryFile : function(entry, creationMethod, onend, onprogress) {
		var writer, zipFileEntry;

		function getData() {
		    entry.getData(writer, function(blob) {
			var blobURL = creationMethod == "Blob" ? URL.createObjectURL(blob) : zipFileEntry.toURL();
			onend(blobURL);
		    }, onprogress);
		}

		if (creationMethod == "Blob") {
		    writer = new zip.BlobWriter();
		    getData();
		} else {
		    createTempFile(function(fileEntry) {
			zipFileEntry = fileEntry;
			writer = new zip.FileWriter(zipFileEntry);
			getData();
		    });
		}
	    }
	};
    })();

    (function() {
	var fileInput = document.getElementById("file-input");
	var unzipProgress = document.createElement("progress");
	var fileList = document.getElementById("file-list");
	var creationMethodInput = document.getElementById("creation-method-input");

	function download(entry, li, a) {
	    model.getEntryFile(entry, creationMethodInput.value, function(blobURL) {
		var clickEvent = document.createEvent("MouseEvent");
		if (unzipProgress.parentNode)
		    unzipProgress.parentNode.removeChild(unzipProgress);
		unzipProgress.value = 0;
		unzipProgress.max = 0;
		clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		a.href = blobURL;
		a.download = entry.filename;
		a.dispatchEvent(clickEvent);
	    }, function(current, total) {
		unzipProgress.value = current;
		unzipProgress.max = total;
		li.appendChild(unzipProgress);
	    });
	}

	if (typeof requestFileSystem == "undefined")
	    creationMethodInput.options.length = 1;
	fileInput.addEventListener('change', function() {
	    fileInput.disabled = true;
	    files = fileInput.files[0];
	    show("muse-src/edu/stanford/muse/xword/Crossword.java");
	    model.getEntries(files, function(entries) {
		entries.forEach(function(entry) {
		    var li = document.createElement("li");
		    var a = document.createElement("a");
		    a.textContent = entry.filename;
		    a.href = "#";
		    a.addEventListener("click", function(event) {
			entry.getData(new zip.TextWriter(), function(text) {
			    // text contains the entry data as a String
			    document.getElementById("control").style.display="none";
			    text = text.replace(/[\/\**\*\/]/g,"");
			    var lines = text.split("\n")
			    var txt = "";
			    lines.map(function(d,i){if(i<(lines.length-1))txt+=d+"\n";})
			    document.getElementById("code").innerHTML = txt
			    setTimeout(function(){SyntaxHighlighter.highlight();},100);

			}
			/*if (!a.download) {
			    download(entry, li, a);
			    event.preventDefault();
			    return false;
			}*/
				     );}, false);
		});
	    });
	}, false);
    })();
    
})(this);

function handle_storage(e){
    if(!e)
	e=window.event;

    if(typeof(files) !== "undefined"){
	if(e.key=="log_string"){
	    //The value that is being read is raw one will be in dot noatation
	    //TODO:I am not sure how the file path would differ in different OS; just check it and add accordingly.
	    var path = localStorage.getItem("file");
	    var zip_file = files.name.split(".")[0];
	    path = path.split(".").join("/");
	    path = zip_file+"/"+path+".java";
	    console.log(path)
	    show(path);
	}
    }
}

function show(file){
    var path = localStorage.getItem("file");
    var zip_file = files.name.split(".")[0];
    console.log("triggered")
    path = path.split(".").join("/");
    file = zip_file+"/"+path+".java";
    //in some cases of reason unknown files are not given the prefix from zip file name.
    var file_other = path+".java"
    var body = document.getElementById("body");
    var div = document.getElementById("container");
    console.log("file "+file)
    console.log("file "+file_other)
    if(elementInDocument(div))
	body.removeChild(div);
    var parent=document.createElement("container");
    parent.id="container"
    var child=document.createElement("pre");
    var found = false;
    model.getEntries(files, function(entries) {
	console.log(file);
	console.log(file_other);
	entries.forEach(function(entry) {
	    //console.log(entry.filename)
	    
	    if(entry.filename==(file_other)||(entry.filename==file)/*"muse-src/edu/stanford/muse/xword/Crossword.java"*/){
		entry.getData(new zip.TextWriter(), function(text) {
		    document.getElementById("control").style.display="none";
		    text = text.replace(/[\/\**\*\/]/g,"");
		    child.innerHTML = text
		    parent.appendChild(child);
		    body.appendChild(parent)
		    child.className = "brush: java"
		    setTimeout(function(){SyntaxHighlighter.highlight();},100);
		})
	    }
	})
    })
    setTimeout(function(){highlight_line({
	"key":"log_string",
	"newValue": localStorage.getItem("log_string")
    });},1000);

};

highlight_line = function(e){
    //var codeContainer = $(".container");
    var codeContainer = document.getElementsByClassName("container")[0];
    console.log(document.getElementsByClassName("container")[0]);
    var nodeList = codeContainer.childNodes;
    var min_score=100000;
    var max_score = -1;
    var bestLine;
    //somehow the line num estimate from ips is completely offbeat.
    var offset = 800;
    //We expect log_string to be reg exp :::Unique::: seperated with lineNum and 
    //then search for +-offset of the given Line num.
    fields = e.newValue.split(':::Unique:::');
    var search_string = fields[0];
    var lineNum = parseInt(fields[1]);
    var bestLineNum = 0;
    for(var i=0;i<nodeList.length;i++){
	var node = nodeList[i];
	var NodeText = node.innerHTML;
	//? for smallest match possible
	var text = NodeText.replace(/<.*?>/g,'');
	//if((i>=(lineNum-offset))&&(i<=lineNum+offset)){
	    //var score = levenshteinenator(search_string,text);
	var score = getMatches(search_string,text);
	if(score>max_score){
	    max_score = score;
	    bestLine = node;
	    bestLineNum = i;
	}
    }
    console.log("Best line "+bestLineNum,search_string);
    bestLine.scrollIntoView();
}

//always search string first
function getMatches(a,b){
    var score = 0; 
    //Some log hint
    if(b.indexOf('log')>-1){
	keywords = a.split(/\s+/);
	for(var i=0;i<keywords.length;i++)
	    if(b.indexOf(keywords[i])>-1)
		score++;
    }
    return score;
}
