//Most of this code handles server responses
let modalOpened = false;
let imageCount = 0;
//Submitfunction for the change language form
$('#changeLanguage').submit(e => {
    //DONOT send this before
    e.preventDefault();
    //declare the data
    const postData = {
           lang : document.getElementById('select').value
    };
    //Make an ajax request
    $.post({
      url: "/settings/changelang",
      data: postData,
      success(response){
          //If there is a response
          if(response){
              //Just this will get displayed and you will be logged out
              Materialize.toast(`Language is now changed, you will be logged out in a moment.`, 3000, "green");
              setTimeout(function(){
                  window.location.href = "/logout";
              }, 3000);
          }
          else{
              Materialize.toast(`Server error`, 3000, "red");
          }
      }
   });
});
$("#createUserForm").submit(function(e){
    e.preventDefault();

    // const $form = $(this);
    // const postData = $form.serializeArray();
    const postData = {
      first_name : $('#first_name').val(),
      last_name : $('#last_name').val(),
      username : $('#username').val(),
      password : $('#password').val(),
      email_address : $('#email_address').val(),
      costumerid : $('#costumerid').val(),
      isAdmin : $('#isAdmin').prop('checked')
    };
    $.post({
        url: "/admin/createuser",
        data: postData,
        success: function(response) {

            switch(response) {
                case "checkData":
                    Materialize.toast(`Error! Please check your information`, 3000, "red");
                    break;
                case "success":

                    window.location.href ="/admin";
                    Materialize.toast(`Successfully created user: ${$("#username").val()}.`, 3000, "green");
                    break;
                case "duplicate":
                    Materialize.toast(`Error! Username, email or user id already taken.`, 3000, "red");
                    break;
                default:
                    Materialize.toast(`Server error!`, 3000, "red");
                    break;
            }

        },
        error: function(error) {
            console.log(error);
        }
    });

    return false;
});
function getFiles(e, uname){
    if(e.getAttribute("added") == "true"){
        return false;
    }
    else{
        $.get({
            url: `/files/${uname}?dir=${e.id}`,
            success(response){
                for(let i = 0; i < response.file.length; i++){
                    $(e).append('<div class="collapsible-body active" style="display:block">' +
                        '<a href="#" onclick="openModal(`'+uname+'`,`#showPicture`,`'+e.id+'`,`'+response.file[i]+'`, 2)">'+response.file[i]+'</a>' +
                        '</div>');
                }
                e.setAttribute("added", "true");
            },
            error(err){
                console.log(err);
            }
        });
    }


}
$(document).ready(function(){
    $('.collapsible').collapsible();
    $('.modal').modal();
    $('.button-collapse').sideNav();
    $('select').material_select();
});
function deleteUser(e, uname){
    let check = confirm("Do you really want to delete this user? (all data will permanently be deleted)");
    if(check){
        $.ajax({
            url: '/admin/deleteuser?user=' + uname,
            type: 'GET',
            success(response){
                if(response){
                    e.parentNode.parentNode.remove();
                    Materialize.toast(`Successfully deleted user: ${uname}.`, 3000, "green");
                }
                else{
                    Materialize.toast(`Failed to delete user: ${uname}.`, 3000, "red");
                }
            },
            error(err){
                Materialize.toast(`Server error!`, 3000, "red");
                console.log(err);
            }
        });

    }
}
function openModal(uname,modal, dirname, filename, id){
    if(modalOpened){
        $(`${modal}`).modal('open');
    }
    else{
        $(`${modal}`).modal('open');
        switch(id){
            case 1:
                $(`${modal} .modal-content`).append('<input id="form_username_createAssignment" value="'+uname+'" name="username" type="hidden">');
                modalOpened = true;
                break;
            case 2:
                if(imageCount >= 1){
                    $(`${modal} .modal-content`).empty();
                    $(`#downloadPicture`).remove();
                }
                $(`${modal} .modal-content`).append('<img src="/data/userdata/'+uname+'/'+dirname+'/'+filename+'" style="width: 100%;">');
                $(`${modal} .modal-footer`).append('<a href="/files/'+uname+'/download/'+filename+'?dir='+dirname+'" id="downloadPicture" class="btn-flat">Herunterladen</a>');
                ++imageCount;
                break;
        }
    }
}
function deleteThis(e,dir, uname){
    let check = confirm("Do you really want to remove this order? (all data will permanently be deleted)");
    console.log(dir);
    console.log(uname);
    if(check){
        $.ajax({
            url: '/admin/delete?user='+uname+'&file='+dir,
            success(){
                    Materialize.toast(`Order successfully deleted.`, 3000, "green");
                    e.parentElement.parentElement.remove();
            },
        });
    }

}
function changePassword(i) {
    const data = $(i).serializeArray();
    $.post({
        url: "/changepass",
        data: data,
        success(response) {
            switch (response) {
                case 'doesntMatch':
                    Materialize.toast(`Password mismatch.`, 3000, "red");
                    break;
                case 'success':
                    Materialize.toast(`Password successfully changed`, 3000, "green");
                    break;
                case 'logout':
                    window.location.href = "/logout";
                    break;
                case 'toShort':
                    Materialize.toast(`Password must contain at least 8 characters`, 3000, "red");
                    break;
                case "success2":
                    Materialize.toast(`Password successfully changed. You will be logged out now.`, 3000, "green");
                    setTimeout(function(){
                        window.location.href = "/logout";
                    },3000);
                    break;
                default:
                    Materialize.toast(`Server error!`, 3000, "red");
                    break;
            }
        },
        error(err) {
            console.log(err);
        }
    });
    return false;
}