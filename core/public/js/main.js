//todo Erst location dann toast
let modalOpened = false;
let imageCount = 0;
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
                    Materialize.toast(`Fehlgeschlagen! Überprüfe deine Daten!`, 3000, "red");
                    break;
                case "success":

                    window.location.href ="/admin";
                    Materialize.toast(`Das erstellen des Benutzers: ${$("#username").val()} war erfolgreich.`, 3000, "green");
                    break;
                case "duplicate":
                    Materialize.toast(`Fehlgeschlagen! Ein Duplikat liegt vor! Benutzername Email oder Kundennummer ist schon vorhanden.`, 3000, "red");
                    break;
                default:
                    Materialize.toast(`Serverfehler!`, 3000, "red");
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
});
function deleteUser(e, uname){
    let check = confirm("Wollen Sie den Benutzer wirklich löschen? (Alle Daten werden unwiederruflich gelöscht)");
    if(check){
        $.ajax({
            url: '/admin/deleteuser?user=' + uname,
            type: 'GET',
            success(response){
                if(response){
                    e.parentNode.parentNode.remove();
                    Materialize.toast(`Das Löschen des Benutzers: ${uname} war erfolgreich.`, 3000, "green");
                }
                else{
                    Materialize.toast(`Das Löschen des Benutzers: ${uname} war nicht erfolgreich.`, 3000, "red");
                }
            },
            error(err){
                Materialize.toast(`Serverfehler`, 3000, "red");
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
    let check = confirm("Wollen Sie den Auftrag wirklich löschen? (Alle Daten werden unwiederruflich gelöscht)");
    console.log(dir);
    console.log(uname);
    if(check){
        $.ajax({
            url: '/admin/delete?user='+uname+'&file='+dir,
            success(){
                    Materialize.toast(`Das löschen des Auftrages war erfolgreich.`, 3000, "green");
                    e.parentElement.parentElement.remove();
            },
        });
    }

}
$('#changePw').submit(function(e){
    e.preventDefault();
   const data = $(this).serializeArray();

   $.post({
      url: '/admin/changepw',
      data: data,
      success(response){
        switch(response){
            case 'doesntMatch':
                Materialize.toast(`Die Passwörter stimmen nicht überein.`, 3000, "red");
                break;
            case 'success':
                Materialize.toast(`Die Änderung des Passwortes war erfolgreich!`, 3000, "green");
                break;
            case 'logout':
                window.location.href = "/logout";
                break;
            case 'toShort':
                Materialize.toast(`Das angegebene Passwort ist zu kurz. Es muss mindestens acht Zeichen lang sein`, 3000, "red");
                break;
            default:
                Materialize.toast(`Serverfehler`, 3000, "red");
                break;
        }
      },
      error(err){
          console.log(err);
      }
   });
});