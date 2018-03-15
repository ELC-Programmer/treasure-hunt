$(document).on('change', '.btn-file :file', function() {
  var input = $(this),
      numFiles = input.get(0).files ? input.get(0).files.length : 1,
      label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
  input.trigger('fileselect', [numFiles, label]);
});

$(document).ready( function() {
    $('.btn-file :file').on('fileselect', function(event, numFiles, label) {
        
        var input = $(this).parents('.input-group').find(':text'),
            log = numFiles > 1 ? numFiles + ' files selected' : label;
        
        if( input.length ) {
            input.val(log);
        } else {
            if( log ) alert(log);
        }
        
    });
});
$(".tab").hide();

$("#daily-annoucements-tab").show();

$("#daily-annoucements-button").click(function()
{
	$(".tab-button.active").removeClass("active");
	$("#daily-annoucements-button").addClass("active");
	$(".tab").hide();
	$("#daily-annoucements-tab").show();
	$("#tab").val("daily-annoucements-button");
});


$("#daily-alerts-button").click(function()
{
	$(".tab-button.active").removeClass("active");
	$("#daily-alerts-button").addClass("active");
	$(".tab").hide();
	$("#daily-alerts-tab").show();
	$("#tab").val("daily-alerts-button");
});

$("#event-alerts-button").click(function()
{
	$(".tab-button.active").removeClass("active");
	$("#event-alerts-button").addClass("active");
	$(".tab").hide();
	$("#event-alerts-tab").show();
	$("#tab").val("event-alerts-button");
});

$("#sea-captain-button").click(function()
{
	$(".tab-button.active").removeClass("active");
	$("#sea-captain-button").addClass("active");
	$(".tab").hide();
	$("#sea-captain-tab").show();
	$("#tab").val("sea-captain-button");
});