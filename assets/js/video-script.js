/*---  Globals  ---*/
const showLog = false; /* display few logs in console */

const useCache = true; /* cache data in localStorage */
const ttl = 3600; /* cache duration 1h */
const prefix = 'video-api-';
const cachePrefix = prefix+'cache_';
const reloadFilters = prefix+'filters';
let fromAjax = false;

const limit = 20; /* number of items loaded, set to 0 to load all */
let offset = 0, startTime = 0, endTime = 0; ajaxTimeout = 1500;
let isLoading = false, isComplete = (limit>0 ? false : true);

const apiKey = 'video-api-public-key';
const APIroot = "https://www.ianasheu.com/video/api";
const FRONTroot = (window.location.href).split('?')[0];
let URLpath = '', URLorderfilter = '', URLoffsetfilter = '';


/*---  On page loaded  ---*/
document.addEventListener('DOMContentLoaded', function () {

	/* page objects */
	const searchform = document.getElementById("searchform");
	searchform.addEventListener('input', () => formChange());
	searchform.addEventListener('submit', (event) => {
		event.preventDefault();
	});
	document.addEventListener('keydown', (event) => typeKeyword(event));
	window.addEventListener('scroll', () => moreResult());

	let loadsome = document.getElementById("loadsome");
	let deck = document.getElementById("deck");
	let loadmore = document.getElementById("loadmore");

	window.addEventListener('beforeunload', () => setFilters(true));
	const camera = document.getElementById("camera");
	if(camera && !isMobile()) {
		camera.addEventListener('click', () => setFilters());
		camera.style.display='initial';
	}

	const searchstrict = document.getElementById("searchstrict");
	if(searchstrict && !isMobile()) {
		searchstrict.style.display='flex';
	}

	const resetall = document.getElementById("resetall");
	if(resetall && !isMobile()) {
		resetall.addEventListener('click', () => setForm());
		resetall.style.display='initial';
	}


	/* initialize search form */
	window.initcategory = new Array();
	window.previouscategory = new Array();
	clearCache();
	initCategoryList();
	initYearRatingRanges();


	/* store initial search form values */
	window.initstrict = document.getElementById("strict").checked;
	window.initkeyword = document.getElementById("keyword").value.trim().replace(/\s+/g, " ");
	window.initminyearinput = document.getElementById("minyearinput").value;
	window.initmaxyearinput = document.getElementById("maxyearinput").value;
	window.initminratinginput = document.getElementById("minratinginput").value;
	window.initmaxratinginput = document.getElementById("maxratinginput").value;
	window.initorderby = (document.querySelector('input[name="orderby"]:checked') ? document.querySelector('input[name="orderby"]:checked').value : '');

	URLorderfilter = (initorderby ? "orderby="+initorderby : '');
	URLoffsetfilter = (limit>0 ? "limit="+limit+"&offset="+offset : '');

	window.previousstrict = initstrict;
	window.previouskeyword = initkeyword;
	window.previousminyearinput = initminyearinput;
	window.previousmaxyearinput = initmaxyearinput;
	window.previousminratinginput = initminratinginput;
	window.previousmaxratinginput = initmaxratinginput;
	window.previousorderby = initorderby;


	/* initialize main ajax request object */
	let request = new XMLHttpRequest();
	request.addEventListener('load', () => displayResult(request.responseURL, request.status, request.response, parseInt(request.getResponseHeader("X-Total-Count"))));
	request.addEventListener('timeout', () => timeoutFromAjax());
	request.addEventListener('abort', () => console.log("Annulation Ajax"));
	request.addEventListener('error', () => console.log("Erreur Ajax"));
	request.timeout = ajaxTimeout;
	request.responseType = "json";


	/* initialize movie category list */
	function initCategoryList() {

		let categorylist = document.getElementById("categorylist");
		let reqCat = new XMLHttpRequest();
		reqCat.addEventListener('load', () => {
			if (reqCat.response) {
				let categories = '';
				let catLign = '';
				reqCat.response.forEach((category) => {
					catLign =
`						<div><input type="checkbox" id="category${category.tag}" value="${category.id}">&nbsp;<label for="category${category.tag}">${category.tag}</label></div>
`;
					categories += catLign;
				});
				let catsToAdd = document.createElement('template');
				catsToAdd.innerHTML = categories;
				categorylist.appendChild(catsToAdd.content);

				document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {initcategory.push(parseInt(chk.value))});
				previouscategory = initcategory.slice();

				let categorylistitem = document.querySelectorAll('#categorylist div');
				categorylistitem.forEach((item) => {
					item.addEventListener('click', (event) => {
						if (item!==event.target) return;
						chkbx = event.target.querySelector('input[type="checkbox"]');
						chkbx.click();
						event.stopPropagation();
					}, false);
				});

				document.getElementById("resetcategory").addEventListener('click', (event) => {
					document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {chk.checked = false;});
					searchform.dispatchEvent(new Event('input', { bubbles: true }));
				});

				const step = 1.5 * 2 * getRemInPx();
				categorylist.addEventListener('wheel', (e) => {
					e.preventDefault();
					categorylist.scrollTop += Math.sign(e.deltaY) * step;
				}, { passive: false });
			} else {
				document.querySelector(".categorytitle").style.display = "none";
				document.getElementById("categorylist").style.display = "none";
			}
			getFilters();
		});
		reqCat.addEventListener('timeout', () => console.log("Category List Timeout Ajax"));
		reqCat.addEventListener('abort', () => console.log("Category List Annulation Ajax"));
		reqCat.addEventListener('error', () => console.log("Category List Erreur Ajax"));
		reqCat.timeout = ajaxTimeout;
		reqCat.responseType = "json";
		try {
			reqCat.open("GET", APIroot + "/category?orderby=tag", true);
			reqCat.setRequestHeader('x-api-key', apiKey);
			reqCat.send();
		} catch (error) {
			console.log("Category List Catch Ajax");
		}
	}


	/* initialize year range and rating range */
	function initYearRatingRanges() {

		let minyearoutput = document.getElementById("minyearoutput");
		let maxyearoutput = document.getElementById("maxyearoutput");
		let minyearinput = document.getElementById("minyearinput");
		let maxyearinput = document.getElementById("maxyearinput");
		minyearoutput.textContent = minyearinput.value;
		minyearinput.addEventListener('input', (event) => {
			minyearoutput.textContent = event.target.value;
			if (minyearinput.value > maxyearinput.value) {
				maxyearoutput.textContent = minyearinput.value;
				maxyearinput.value = minyearinput.value;
			}
		});
		maxyearoutput.textContent = maxyearinput.value;
		maxyearinput.addEventListener('input', (event) => {
			maxyearoutput.textContent = event.target.value;
			if (maxyearinput.value < minyearinput.value) {
				minyearoutput.textContent = maxyearinput.value;
				minyearinput.value = maxyearinput.value;
			}
		});

		let minratingoutput = document.getElementById("minratingoutput");
		let maxratingoutput = document.getElementById("maxratingoutput");
		let minratinginput = document.getElementById("minratinginput");
		let maxratinginput = document.getElementById("maxratinginput");
		minratingoutput.textContent = minratinginput.value;
		minratinginput.addEventListener('input', (event) => {
			minratingoutput.textContent = event.target.value;
			if (minratinginput.value > maxratinginput.value) {
				maxratingoutput.textContent = minratinginput.value;
				maxratinginput.value = minratinginput.value;
			}
		});
		maxratingoutput.textContent = maxratinginput.value;
		maxratinginput.addEventListener('input', (event) => {
			maxratingoutput.textContent = event.target.value;
			if (maxratinginput.value < minratinginput.value) {
				minratingoutput.textContent = maxratinginput.value;
				minratinginput.value = maxratinginput.value;
			}
		});
	}


	/* check for search form changes */
	function formChange() {

		const previousURLpath = URLpath, previousURLorderfilter = URLorderfilter;
		let currentURLpath = '', currentURLorderfilter = '';
		const currentstrict = document.getElementById("strict").checked;
		const currentkeyword = document.getElementById("keyword").value.trim().replace(/\s+/g, " ");
		let currentcategory = new Array();
		document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {currentcategory.push(parseInt(chk.value))});
		const currentminyearinput = document.getElementById("minyearinput").value;
		const currentmaxyearinput = document.getElementById("maxyearinput").value;
		const currentminratinginput = document.getElementById("minratinginput").value;
		const currentmaxratinginput = document.getElementById("maxratinginput").value;
		const currentorderby = (document.querySelector('input[name="orderby"]:checked') ? document.querySelector('input[name="orderby"]:checked').value : '');

		if ((currentstrict != previousstrict && currentstrict != initstrict) || currentstrict != initstrict) {
			if (!currentstrict) {
				currentURLpath += '';
			} else {
				currentURLpath += "/strict/true";
			}
		}
		if ((currentkeyword != previouskeyword && currentkeyword != initkeyword) || currentkeyword != initkeyword) {
			const regex = /"([^"]+)"|([^"]+)/g;
			let rewritedkeyword = '';
			let match;
			while ((match = regex.exec(currentkeyword)) !== null) {
				if (match[1]) {
					rewritedkeyword += match[1].split(' ').map(mot => encodeURIComponent(mot)).join('+');
				} else if (match[2]) {
					rewritedkeyword += match[2].split(' ').map(mot => encodeURIComponent(mot)).join('*');
				}
			}
			currentURLpath += "/keyword/*"+rewritedkeyword+"*";
		}
		if ((currentcategory.toString() != previouscategory.toString() && currentcategory.toString() != initcategory.toString()) || currentcategory.toString() != initcategory.toString()) {
			currentURLpath += "/category/"+currentcategory.toString();
		}
		if ((currentminyearinput != previousminyearinput && currentminyearinput != initminyearinput) || currentminyearinput != initminyearinput) {
			currentURLpath += "/minyear/"+currentminyearinput;
		}
		if ((currentmaxyearinput != previousmaxyearinput && currentmaxyearinput != initmaxyearinput) || currentmaxyearinput != initmaxyearinput) {
			currentURLpath += "/maxyear/"+currentmaxyearinput;
		}
		if ((currentminratinginput != previousminratinginput && currentminratinginput != initminratinginput) || currentminratinginput != initminratinginput) {
			currentURLpath += "/minrating/"+currentminratinginput;
		}
		if ((currentmaxratinginput != previousmaxratinginput && currentmaxratinginput != initmaxratinginput) || currentmaxratinginput != initmaxratinginput) {
			currentURLpath += "/maxrating/"+currentmaxratinginput;
		}
		currentURLorderfilter = (currentorderby ? "orderby="+currentorderby : '');

		previousstrict = currentstrict;
		previouskeyword = currentkeyword;
		previouscategory = currentcategory.slice();
		previousminyearinput = currentminyearinput;
		previousmaxyearinput = currentmaxyearinput;
		previousminratinginput = currentminratinginput;
		previousmaxratinginput = currentmaxratinginput;
		previousorderby = currentorderby;

		if ((currentURLpath != previousURLpath) || (currentURLorderfilter != previousURLorderfilter)) {
			deck.innerHTML = '';
			loadsome.innerHTML = '';
			if (limit > 0) {
				offset = 0;
				URLoffsetfilter = "limit="+limit+"&offset="+offset;
				isComplete = false;
			}
			URLpath = currentURLpath;
			URLorderfilter = currentURLorderfilter;

			if (URLpath != '' && URLpath != "/strict/true") {
				completeURL = APIroot + '/search' + URLpath +
					(URLorderfilter || URLoffsetfilter ? "?" : '') +
					(URLorderfilter ? URLorderfilter : '') +
					(URLorderfilter && URLoffsetfilter ? "&" : '') +
					(URLoffsetfilter ? URLoffsetfilter : '');
				getJSON(completeURL);
			} else {
				window.history.replaceState(null, '', FRONTroot);
			}
		}
	}


	/* get more data when scrolling */
	window.moreResult = function(forced) {

		if (!isComplete) {
			if (((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 700) || forced) && !isLoading) {
				offset += limit;
				URLoffsetfilter = "limit="+limit+"&offset="+offset;
				completeURL = APIroot + '/search' + URLpath +
					(URLorderfilter || URLoffsetfilter ? "?" : '') +
					(URLorderfilter ? URLorderfilter : '') +
					(URLorderfilter && URLoffsetfilter ? "&" : '') +
					(URLoffsetfilter ? URLoffsetfilter : '');
				getJSON(completeURL);
			}
		}
	}


	/* get data from cache or ajax */
	function getJSON(URL) {

		if (URL) {
			isLoading = true;
			if (useCache) {
				getFromCache(URL);
			} else {
				getFromAjax(URL);
			}
		}
	}


	/* read local storage cache */
	function getFromCache(URL) {

		if (URL) {
			cache = window.localStorage.getItem(cachePrefix+stringToHash(URL));
			if (cache) {
				cache = JSON.parse(cache);
				const now = new Date();
				const nowSec = Math.round(now.getTime()/1000);

				if (cache.datetime + ttl > nowSec) {
					if (showLog) console.log("From Local Cache");
					fromAjax = false;
					displayResult(URL, cache.code, cache.response, cache.total);
				} else {
					window.localStorage.removeItem(cachePrefix+stringToHash(URL));
					getFromAjax(URL);
				}
			} else {
				getFromAjax(URL);
			}
		}
	}


	/* call ajax */
	function getFromAjax(URL) {

		if (URL) {
			if (showLog) console.log("From URL: "+URL);
			fromAjax = true;
			if (offset > 0) {
				loadmore.innerHTML = "... Chargement ...";
			} else {
				loadsome.innerHTML = "... Chargement ...";
			}
			startTime = performance.now()/1000;

			try {
				request.open("GET", URL, true);
				request.setRequestHeader('x-api-key', apiKey);
				request.send();
			} catch (error) {
				console.log("Catch Ajax");
			}
		}
	}


	/* ajax timeout */
	function timeoutFromAjax() {

		if (showLog) console.log("Timeout Ajax");
		const msg = document.createElement("span");
		const retryLink = document.createElement("a");
		retryLink.href = "#";
		retryLink.textContent = "Echec, réessayer";
		retryLink.addEventListener("click", (event) => {
			event.preventDefault();
			retryFromAjax();
		});
		msg.appendChild(retryLink);

		if (offset > 0) {
			loadmore.innerHTML = "";
			loadmore.appendChild(msg);
		} else {
			loadsome.innerHTML = "";
			loadsome.appendChild(msg);
		}
	}


	/* retry ajax */
	function retryFromAjax() {

		completeURL = APIroot + '/search' + URLpath +
		(URLorderfilter || URLoffsetfilter ? "?" : '') +
		(URLorderfilter ? URLorderfilter : '') +
		(URLorderfilter && URLoffsetfilter ? "&" : '') +
		(URLoffsetfilter ? URLoffsetfilter : '');
		if (showLog) console.log("Retry URL: "+completeURL);
		getFromAjax(completeURL);
	}


	/* build deck of movie cards */
	function displayResult(URL, httpCode, listResult, total) {

		if (httpCode != 200) {
			if (offset == 0) {
				loadsome.innerHTML = "<b>0&nbsp;films</>";
			}
			loadmore.innerHTML = '';
			isLoading = false;
			isComplete = true;
		} else {
			if (listResult) {
				let newCards = '';
				let cardTemplate = '';
				listResult.forEach((movie) => {

					moviecategorytagtitle = '';
					movie.category.forEach((cat) => { moviecategorytagtitle += `${cat.tag}, `; });
					moviecategorytagtitle = moviecategorytagtitle.slice(0, -2);
					moviecategorysearchtag = '';
					movie.category.forEach((cat) => { moviecategorysearchtag += `<span onclick="setForm(null, null, '${cat.id}', null, null, null, null, 'title')">${cat.tag}</span>, `; });
					moviecategorysearchtag = moviecategorysearchtag.slice(0, -2);
					moviedirectorname = '';
					movie.director.forEach((dir) => { moviedirectorname += (dir.name!='' ? `${dir.name}-` : ''); });
					moviedirectorname = moviedirectorname.slice(0, -1);
					moviedirectornamecountry = '';
					movie.director.forEach((dnc) => {
						moviedirectornamecountry += (dnc.name!='' ? `<span onclick="setForm(null, '${dnc.name}', null, null, null, null, null, 'yearasc')">${dnc.name}</span>` : '');
						moviedirectornamecountry += (dnc.country ? `<img class="flag" src="https://www.ianasheu.com/video/flags/${(dnc.country ? dnc.country.toLowerCase() : "null")}.svg" alt="flag" title="${dnc.state}"> - ` : " - ");
					});
					moviedirectornamecountry = moviedirectornamecountry.slice(0, -3);
					movieminratinginput = Math.floor(parseFloat(movie.rating) * 2) / 2;
					moviemaxratinginput = Math.ceil(parseFloat(movie.rating) * 2) / 2;
					movieratingminmax = `<span onclick="setForm(null, null, null, null, null, ${movieminratinginput}, ${moviemaxratinginput}, 'ratingasc')">${movie.rating}</span>`;
					movieminyearinput = Math.floor(parseInt(movie.year) / 10) * 10;
					moviemaxyearinput = Math.ceil(parseInt(movie.year) / 10) * 10;
					movieyearminmax = `<span onclick="setForm(null, null, null, ${movieminyearinput}, ${moviemaxyearinput}, null, null, 'yearasc')">${movie.year}</span>`;

					cardTemplate =
`			<div class="card">
				<img class="poster" src="https://www.ianasheu.com/video/affiches/${movie.poster}" alt="poster" title="${movie.title} (${(moviedirectorname ? moviedirectorname+"-" : '')}${movie.year})">
				<div class="cardbody">
					<div class="bodylign1">
						<h3 class="title" title="${movie.title}">${movie.title}</h3>
						<div><a href="https://www.allocine.fr/film/fichefilm_gen_cfilm=${movie.allocine}.html" target="_blank" tabindex="-1"><img class="extlink" src="./assets/img/external-link.svg" alt="allocine" title="allocine"></a></div>
					</div>
					<div class="bodylign2">
						<div class="category" title="${moviecategorytagtitle}">${moviecategorysearchtag}</div>
						<div class="rating" title="${movie.rating}"><img class="star" src="./assets/img/half-star.svg" alt="rating" title="rating">&nbsp;${movieratingminmax}</div>
					</div>
					<div class="bodylign3">
						<div class="director" title="${moviedirectorname}">${moviedirectornamecountry}</div>
						<div class="year" title="${movie.year}">${movieyearminmax}</div>
					</div>
				</div>
			</div>
`;
					newCards += cardTemplate;
				});
				let cardsToAdd = document.createElement('template');
				cardsToAdd.innerHTML = newCards;
				deck.appendChild(cardsToAdd.content);
			}

			isLoading = false;
			if (limit > 0) {
				if (offset+limit >= total ) {
					isComplete = true;
				} else {
					isComplete = false;
				}
			}
			if (offset > 0) {
				loadmore.innerHTML = '';
			} else {
				loadsome.innerHTML = "<b>"+total+"&nbsp;films</>";
				window.history.replaceState(null, '', FRONTroot);
			}
		}

		if (useCache && fromAjax) {
			const now = new Date();
			const nowSec = Math.round(now.getTime()/1000);
			window.localStorage.setItem(cachePrefix+stringToHash(URL), JSON.stringify({
				"URL": URL,
				"code": httpCode,
				"response": listResult,
				"total": total,
				"datetime": nowSec
			}));
		}

		if (fromAjax) {
			endTime = performance.now()/1000;
			if (showLog) console.log(`	Temps: ${(endTime - startTime).toFixed(2)} s`);
			fromAjax = false;
		}
	}

}); // end DOMContentLoaded


/*---  Tools functions  ---*/

/* delete outdated items from local storage */
function clearCache(forced) {

	const now = new Date();
	const nowSec = Math.round(now.getTime()/1000);
	let total = 0;

	for (var i = window.localStorage.length-1; i>=0; i--) {
		try {
			cache = JSON.parse(window.localStorage.getItem(window.localStorage.key(i)));
		} catch (e) {
			continue;
		}
		if (cache.hasOwnProperty("datetime")) {
			if ((parseInt(JSON.parse(window.localStorage.getItem(window.localStorage.key(i))).datetime) + ttl < nowSec) || forced) {
				window.localStorage.removeItem(window.localStorage.key(i));
				total++;
			}
		}
	}
	if (showLog || forced) console.log("Clear cache: "+total);
}


/* read url parameters to define search form values */
function getFilters() {

	let storageFilters = window.localStorage.getItem(reloadFilters);

	if (storageFilters) {
		storageFilters = JSON.parse(storageFilters);
		const now = new Date();
		const nowSec = Math.round(now.getTime()/1000);

		if (storageFilters.datetime + 60 > nowSec) {
			storageFilters = storageFilters.filters;
		} else {
			storageFilters = null;
		}
		window.localStorage.removeItem(reloadFilters);
	}

	if (window.location.search)
		filters = new URLSearchParams(window.location.search);
	else
	if (storageFilters)
		filters = new URLSearchParams(storageFilters);
	else
		filters = [];

	let newstrict = null, newkeyword = null,
		newcategory = null,
		newminyearinput = null, newmaxyearinput = null,
		newminratinginput = null, newmaxratinginput = null,
		neworderby = null;

	filters.forEach((value, key) => {
		switch(key) {
			case 'strict':
				newstrict = true;
				break;
			case 'keyword':
				newkeyword = value.replaceAll("*", " ").trim();
				break;
			case 'category':
				newcategory = value;
				break;
			case 'minyear':
				newminyearinput = value;
				break;
			case 'maxyear':
				newmaxyearinput = value;
				break;
			case 'minrating':
				newminratinginput = value;
				break;
			case 'maxrating':
				newmaxratinginput = value;
				break;
			case 'orderby':
				neworderby = value;
				break;
		}
	});

	setForm(newstrict, newkeyword, newcategory, newminyearinput, newmaxyearinput, newminratinginput, newmaxratinginput, neworderby);
	window.history.replaceState(null, '', FRONTroot);
}


/* define url parameters from search form values */
function setFilters(reload = false) {

	let filters = '';
	const currentstrict = document.getElementById("strict").checked;
	const currentkeyword = document.getElementById("keyword").value.trim().replace(/\s+/g, " ");
	let currentcategory = new Array();
	document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {currentcategory.push(parseInt(chk.value))});
	const currentminyearinput = document.getElementById("minyearinput").value;
	const currentmaxyearinput = document.getElementById("maxyearinput").value;
	const currentminratinginput = document.getElementById("minratinginput").value;
	const currentmaxratinginput = document.getElementById("maxratinginput").value;
	const currentorderby = (document.querySelector('input[name="orderby"]:checked') ? document.querySelector('input[name="orderby"]:checked').value : '');

	if (currentstrict != initstrict) {
		if (!currentstrict) {
			filters += '';
		} else {
			filters += "&strict=true";
		}
	}
	if (currentkeyword != initkeyword) {
		filters += "&keyword=*"+encodeURIComponent(currentkeyword.replace(/\s/g, "*"))+"*";
	}
	if (currentcategory.toString() != initcategory.toString()) {
		filters += "&category="+currentcategory.toString();
	}
	if (currentminyearinput != initminyearinput) {
		filters += "&minyear="+currentminyearinput;
	}
	if (currentmaxyearinput != initmaxyearinput) {
		filters += "&maxyear="+currentmaxyearinput;
	}
	if (currentminratinginput != initminratinginput) {
		filters += "&minrating="+currentminratinginput;
	}
	if (currentmaxratinginput != initmaxratinginput) {
		filters += "&maxrating="+currentmaxratinginput;
	}
	if (currentorderby != initorderby) {
		filters += "&orderby="+currentorderby;
	}

	if (reload) {
		const now = new Date();
		const nowSec = Math.round(now.getTime()/1000);
		window.localStorage.setItem(reloadFilters, JSON.stringify({
			"filters": filters,
			"datetime": nowSec
		}));
	} else {
		filters = (filters ? "?"+filters.substring(1) : '');
		window.history.replaceState({uniquid:uuid()}, 'VIDEO', FRONTroot+filters);
	}
}


/* setup search form values */
function setForm(newstrict, newkeyword, newcategory, newminyearinput, newmaxyearinput, newminratinginput, newmaxratinginput, neworderby) {

	newstrict = (newstrict == undefined ? initstrict : newstrict);
	strict.checked = newstrict;

	document.getElementById("keyword").value = (newkeyword == undefined ? initkeyword : newkeyword);

	if (newcategory == undefined) {
		document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {chk.checked = false;});
		initcategory.forEach((id) => {document.querySelector('input[id^="category"][value="'+id+'"]').checked = true;});
	} else {
		document.querySelectorAll('input[id^="category"]:checked').forEach((chk) => {chk.checked = false;});
		newcategory.split(',').forEach((id) => {document.querySelector('input[id^="category"][value="'+id+'"]').checked = true;});
	}

	newminyearinput = (newminyearinput == undefined ? initminyearinput : newminyearinput);
	newmaxyearinput = (newmaxyearinput == undefined ? initmaxyearinput : newmaxyearinput);
	newminratinginput = (newminratinginput == undefined ? initminratinginput : newminratinginput);
	newmaxratinginput = (newmaxratinginput == undefined ? initmaxratinginput : newmaxratinginput);

	minyearinput.value = newminyearinput;
	maxyearinput.value = newmaxyearinput;
	minratinginput.value = newminratinginput;
	maxratinginput.value = newmaxratinginput;
	minyearoutput.textContent = newminyearinput;
	maxyearoutput.textContent = newmaxyearinput;
	minratingoutput.textContent = newminratinginput;
	maxratingoutput.textContent = newmaxratinginput;

	document.querySelector('input[name="orderby"][value="'+(neworderby == undefined ? initorderby : neworderby)+'"]').checked = true;

	searchform.dispatchEvent(new Event('input', { bubbles: true }));
	window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* used by keyboard down to focus on search input */
function typeKeyword(event) {

	if ((event.key == "F3") || ((event.ctrlKey || event.metaKey) && event.key == "f")) {
		event.preventDefault();

		keyword.focus();
		keyword.select();
	}
}


/* convert a string to a hash */
function stringToHash(string) {

	let hash = 0;

	if (string.length == 0) return hash;
	for (i = 0; i<string.length; i++) {
		charCode = string.charCodeAt(i);
		hash = ((hash << 5) - hash) + charCode;
		hash |= hash;
	}
	return hash;
}

 /* return unique id */
function uuid() {

	return '00000000-00000000'.replace(/[0]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}


/* eval if brother run on mobile */
function isMobile() {

	const toMatch = [
			/Android/i,
			/webOS/i,
			/iPhone/i,
			/iPad/i,
			/iPod/i,
			/BlackBerry/i,
			/Windows Phone/i
	];

	return toMatch.some(
		(toMatchItem) => {
			return navigator.userAgent.match(toMatchItem);
		}
	);
}


/* return root foot size */
function getRemInPx() {

	const fontSize = getComputedStyle(document.documentElement).fontSize;

	return parseFloat(fontSize);
}
