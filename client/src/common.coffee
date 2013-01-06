$(document).ready ->
    $(".dropdown-menu").click -> $(".content", this).toggle() 
    $(".dropdown-menu > .content").click (event) -> event.stopPropagation()
    $(".dropdown-menu > .content a:not(.dontCloseMenu)").click -> $(this).parents(".content").hide()
    $(".dropdown-menu").mouseleave -> $(".content", this).hide()
    
    $(".actionButton").mousedown -> $(this).addClass("pressed")
    $(".actionButton").mouseup -> $(this).removeClass("pressed")
    $(".actionButton").mouseleave -> $(this).removeClass("pressed")
