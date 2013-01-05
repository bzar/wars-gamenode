$(document).ready ->
    $(".dropdown-menu").click -> $(".content", this).toggle() 
    $(".dropdown-menu > .content").click (event) -> event.stopPropagation()
    $(".dropdown-menu").mouseleave -> $(".content", this).hide()

