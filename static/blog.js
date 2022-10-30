
//variables to store selected option
var selectedSub = document.querySelector("#subjectList .active").id;
var selectedNav = document.querySelector("#blogNav .nav-link.active").id;
var selectedExam = document.querySelector('#blogNav .dropdown-item.active').id;



//Update blog list after page load
updateBloglist();

// Update data based on the selection
function updateBloglist() {
    fetch("/blogs", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            subject: selectedSub,
            nav: selectedNav,
            exam: selectedExam
        })
    })
        .then((response) => response.json())
        .then((blogviews) => {
            // console.log(data);
            updateUI(blogviews);
        })
        .catch((error) => console.log("Cannot load data"));
}


//Update UI
function updateUI(blogviews) {

    let monthDict = { 0: "Jan", 1: "Feb", 2: "Mar", 3: "Apr", 4: "May", 5: "Jun", 
                    6: "July", 7: "Aug", 8: "Sep", 9: "Oct", 10: "Nov", 11: "Dec" };

    let blogList = document.getElementById("blog-list");//container for blog list
    blogList.innerHTML = ''; // Empty bloglist if there are no blogs

    for (i = 0; i < blogviews.length; i++) {

        //Date format in local time
        let date = new Date(blogviews[i].date);
        date = monthDict[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();

        // Show exam name if there is any
        let examview = ``;
        if (blogviews[i].exam != "noexam") {
            examview = `<span class="badge rounded-pill p-2">${blogviews[i].exam}</span>`;
        }

        //Publish button for draft dcouments
        let publishBtn = '';
        
        if (!blogviews[i].published) {
            publishBtn =
                `<button type="button" class="btn btn-secondary btn-sm" id="${blogviews[i].id}" onClick="publishDocument(this.id)">
                    <i class="fa-solid fa-upload"></i> Publish
                </button>`
        }

        //HTML content for editor
        let editorOption =
            `<div class="col text-end">
                <button type="button" class="btn btn-secondary btn-sm" id="${blogviews[i].id}" onClick="editDocument(this.id)">
                    <i class="fa-solid fa-user-pen"></i> Edit
                </button>
                ${publishBtn}
                <button type="button" class="btn btn-secondary btn-sm"
                data-bs-toggle="modal" data-bs-target="#deleteModal" id="delete">
                    <i class="fa-solid fa-trash-can"></i> Delete
                </button>

                <!-- Modal to Show Beforre Delete or Publish-->
                <div class="modal fade" id="deleteModal" data-bs-backdrop="static"
                data-bs-keyboard="false" tabindex="-1"
                aria-labelledby="staticBackdropLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="staticBackdropLabel">This
                                will delete the blog permanently</h5>
                            </div>
                            <div class="modal-body">
                                <p>Do you want to continue ?</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary"
                                data-bs-dismiss="modal">No</button>
                                <button type="button" class="btn btn-primary"
                                id="${blogviews[i].id}" data-bs-dismiss="modal" onClick="deleteConfirm(this.id)">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`

        if (!blogviews[i].editor) { //IF user is not logged in, do not show editor options
            editorOption = '';
        }

        let html =
            `<div class="row">
                <h4  id=${blogviews[i].id} onClick="onClickBlogTitle(this.id)">${blogviews[i].title}</h4>
                <div class="col text-start">
                    <span class="badge rounded-pill p-2 my-2">${blogviews[i].subject}</span>
                    <span class="badge rounded-pill p-2">${date}</span>
                    ${examview}
                </div>
                ${editorOption}
                <p>${blogviews[i].paragraph}</p>
            </div>`
        let child = document.createElement("div");
        child.innerHTML = html;
        blogList.appendChild(child);
    }
}


//Blog title click listener - redirect to individual blog page
function onClickBlogTitle(id) {
    window.open("/blog/" + id);
}


// Subject List Selection
const subjectList = document.getElementById("subjectList");
subjectList.addEventListener("click",
    function (ev) {
        // Write fronend logic on click
        //1. Remove Focus From All Elements
        const items = subjectList.getElementsByTagName('li');
        for (i = 0; i < items.length; i++) {
            items[i].classList.remove("active");
        }
        // 2. Focus on Selected Element
        ev.target.classList.add("active");


        //Update the bloglist based on selected subject
        selectedSub = ev.target.id;
        updateBloglist();

    });

//Blog Nav Selection
const blognavlist = document.getElementById("blogNav");
blognavlist.addEventListener("click", function (ev) {
    // Write frontend logic on click
    //Click on nav menus
    if (Array.from(ev.target.classList).includes("nav-link")) {
        //1. Remove Focus From All Elements
        const items = blognavlist.querySelectorAll(".nav-link");
        for (i = 0; i < items.length; i++) {
            items[i].classList.remove("active");
        }
        // 2. Focus on Selected Element
        ev.target.classList.add("active");

        //Select nav and update UI
        if (ev.target.id) {
            selectedNav = ev.target.id;
            updateBloglist();
        }


    }

    //click on dropdown
    if (Array.from(ev.target.classList).includes("exam-menu")) {
        //1. Remove Focus From All Elements
        const items = blognavlist.querySelectorAll(".exam-menu.dropdown-item");
        for (i = 0; i < items.length; i++) {
            items[i].classList.remove("active");
        }
        // 2. Focus on Selected Element
        ev.target.classList.add("active");

        //Select exam and update UI
        selectedExam = ev.target.id;
        updateBloglist();
    }

});

//Edit button listener
function editDocument(id) {
    window.open("/editor/" + id);
}

//Delete listener
function deleteConfirm(id) {
    fetch("/delete/" + id)
        .then((response) => {
            if (response.redirected) {// Redirect to login page if user is logout
                window.location.href = response.url;
            }
            return response.json()
        })
        .then((response) => {
            if (response.status == "deleted") { //Update the UI 
                updateBloglist();
                showSnack("Document deleted successfully ..");
            }
        })
        .catch((error) => console.log("Cannot load data"));
}

//Publish listener
function publishDocument(id) {
    fetch("/publish/" + id)
        .then((response) => {
            if (response.redirected) {// Redirect to login page if user is logout
                window.location.href = response.url;
            }
            return response.json();
        })
        .then((response) => {
            if (response.status == "published") { //Update the UI 
                updateBloglist();
                showSnack("Document published successfully ..");
            }
        })
        .catch((error) => console.log("Cannot load data"));
}

//Show snackbar
function showSnack(message) {
    // Code taken from W3School
    var x = document.getElementById("snackbar");
    x.innerHTML = message;
    x.className = "show";
    setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);

}

//Increase size of search input on click
let searchcontainer = document.querySelector(".blog-search");
let searchinput = document.querySelector(".blog-search .form-control");
let dropdown = document.querySelector(".blog-search .dropdown-menu")

searchinput.addEventListener("focus", (ev) => {
    // searchcontainer.classList.add("blog-input-large");
});

searchinput.addEventListener("blur", (ev) => {
    // searchcontainer.classList.remove("blog-input-large");
    ev.target.value = "";
});


//Search input listener - debouncing at every 2000 ms
//If time between pause and type is more than 2000 ms  - then only input will be detected

const debounce = (func, delay)=>{
    let timeOut; //Defining timeout
    return function() {
        let context = this;
        let args = arguments;
        
        if (timeOut){
            clearTimeout(timeOut);
        }
        timeOut = setTimeout(() => {
            func.apply(context, args);
        } ,delay);
    }
}

searchinput.addEventListener ("input", debounce( (ev) =>{
    let searchString = ev.target.value;

    fetch("/search", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: searchString })
    })
        .then((response) => response.json())
        .then((results) => {
            let dropdownMenu = document.querySelector(".blog-search .dropdown-menu");
            dropdownMenu.innerHTML = ""; //delete the previous list
            results.forEach((result) => {
                let listLink = `<a href="/blog/${result.id}" target="_blank" class="dropdown-item text-truncate overflow-hidden py-2">${result.blogTitle}</a>`;
                let listItem = document.createElement("li");
                listItem.innerHTML = listLink;
                dropdownMenu.appendChild(listItem);
            })
        })
        .catch((error) => {console.log("cannot fetch search result")});
},2000));


