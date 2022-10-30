
//ID of the saved blog : If in edit mode it will be id of the saved blog
// Otherwise it will be -1
var blogId;

let formId = document.getElementsByTagName("form")[0].id;
if (formId.length != 0)
    blogId = formId;
else
    blogId = -1;

console.log(blogId);

//Uploaded Images in a browser session
const imagesUploaded = [];

//Initialise tiny MCE text editor
tinymce.init({
    selector: '#blogBody',
    plugins: 'preview importcss searchreplace autolink save visualblocks visualchars fullscreen image link table charmap advlist lists wordcount help charmap emoticons',
    toolbar: "undo redo | bold italic underline strikethrough | blocks | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | charmap emoticons | fullscreen  preview print | insertfile image link",
    file_picker_types: 'image',
    images_upload_url: "/upload_image",
    images_upload_handler: handle_image_upload,
    automatic_uploads: true,
    autosave_ask_before_unload: false,
    init_instance_callback: (activeditor) => {
        //after initialisation store the present images in imagesUploaded
        let content = activeditor.getContent();
        console.log(content);

        //replace all the ="../uploads or ="uploads with ="/uploads
        let re = /\W*uploads/g;
        content = content.replace(re,  '="/uploads'); 

        //extract all present images
        re = /\/uploads\/images\/\d*-\d*.png/g;
        let matches = content.match(re);
        if (matches){ //if images are present
            matches.forEach((match) => {
                imagesUploaded.push(match);
            });
        }
    }

});



//Custom image uploader for TinyMCE
function handle_image_upload(blobInfo, success, failure, progress) {

    const postImage = async function getImageUrl() {
        const formData = new FormData();
        formData.set("image", blobInfo.blob());
        const response = await fetch("/upload_image", {
            method: "POST",
            body: formData
        });
        const jsonData = await response.json();
        imagesUploaded.push(jsonData.location);

        // console.log(jsonData.location);
        return jsonData.location;
    }

    return postImage();
}



//Save button click listener
document.getElementById("save").addEventListener("click", function (ev) {
    let inputs = validateAndGetInput();

    if (inputs) {
        saveData(inputs)
            .then((result) => {
                // console.log(result);
                if (result.status == "updated") { //The database gets updated successfully
                    showSnack("Document saved successfully ..");
                }
                else if (result.status == "error") {//Data is not saved
                    showSnack("Document not saved. Something went wrong ..")
                }
                else {// New document is saved and id is returned
                    blogId = result.status;
                    showSnack("New document created and saved successfully ..");
                }
            })
            .catch((error) => {
                showSnack("Something went wrong");
            });

    }

    else {
        console.log("Validation Error");
    }
});


//Saveandcontinue button click listener
document.getElementById("saveandproceed").addEventListener("click", function (ev) {
    let inputs = validateAndGetInput();

    if (inputs) {
        saveData(inputs)
            .then((result) => {

                if (result.status != "error") {//Data is saved successfully - redirect to new page
                    showSnack("Data saved successfully ..");
                    window.location.href = "/blogs"; //redirect to blogs page
                }

            })
            .catch((error) => {
                showSnack("Something went wrong");
            });

    }

    else {
        console.log("Validation Error");
    }
});

//Save the document in the database and return a promise
async function saveData(inputs) {
    // Do a post request to server using the data
    try {
        let response = await fetch("/save", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inputs)
        });

        if (response.redirected) { // Redirected to login page if logout
            window.location.href = response.url;
        }
        let result = await response.json();
        return result;
    }
    catch (error) {
        throw Error(error);
    }

}


//Show snackbar
function showSnack(message) {
    // Code taken from W3School
    var x = document.getElementById("snackbar");
    x.innerHTML = message;
    x.className = "show";
    setTimeout(function () { x.className = x.className.replace("show", ""); }, 3000);

}

// validate form
function validateAndGetInput() {
    let blogTitle = document.getElementById("blogTitle").value;
    let subject = document.getElementById("topic").value;
    if (subject == "others") {
        subject = document.getElementById("otherTopic").value;
        if (subject.length == 0) {
            alert("Please write subject name you want to add");
            document.getElementById("otherTopic").focus();
            return;
        }
    }

    let exam = document.getElementById("exams").value;
    if (exam == "others") {
        exam = document.getElementById("otherExam").value;
        if (exam.length == 0) {
            alert("Please write exam name you want to add");
            document.getElementById("otherExam").focus();
            return;
        }
    }

    if (blogTitle.length == 0) {
        alert("Please write your question first");
        document.getElementById("blogTitle").focus();
        return;
    }

    else {
        let blogBody = tinymce.activeEditor.getContent();
        let re = /\W*uploads/g;
        blogBody = blogBody.replace(re,  '="/uploads'); //replace all the ="../uploads or ="uploads with ="/uploads

        console.log(blogBody);
        return {
            blogTitle: blogTitle,
            subject: subject,
            exam: exam,
            images: imagesUploaded,
            blogBody: blogBody,
            blogId: blogId
        }
    }
}

//Subject Selection
const select = document.getElementById('topic');
const otherTopic = document.getElementById("otherTopic");

function changeTopic(){
    var value = select.options[select.selectedIndex].value;
    if (value == "others") {
        otherTopic.removeAttribute("disabled", true);
    }
    else {
        otherTopic.value = "";
        otherTopic.setAttribute("disabled", false);
    }
}

select.addEventListener("change", changeTopic);
select.addEventListener("click", changeTopic);





//Exam Selection
const exams = document.getElementById('exams');
const otherExam = document.getElementById("otherExam");

exams.addEventListener("change", function () {
    var value = this.options[this.selectedIndex].value;
    if (value == "others") {
        otherExam.removeAttribute("disabled", true);
    }
    else {
        otherExam.value = "";
        otherExam.setAttribute("disabled", false);
    }
});





