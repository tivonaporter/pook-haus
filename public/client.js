$(document).ready(function() {
  $("button").on("click", function() {
    var data = { id: $(this).data("id"), command: $(this).data("command") };
    $.ajax({
      type: "POST",
      url: "/command",
      data: JSON.stringify(data),
      contentType: "application/json; charset=utf-8",
      dataType: "json"
    });
  })
});
