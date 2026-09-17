/**
 * Discord Forms embed helper. Drop this alongside an iframe pointed at a public
 * form (see the "Web Form" tab in the dashboard for the exact snippet) and it
 * auto-resizes the iframe to fit the form's content, so it never shows an inner
 * scrollbar. No configuration needed — it listens for a postMessage the form
 * page itself sends (see PublicFormRenderer) and matches it to the right iframe
 * by source window, so multiple embedded forms on one page all work independently.
 */
(function () {
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "discord-forms:resize") return;
    var iframes = document.querySelectorAll("iframe[data-discord-forms]");
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === event.source) {
        iframes[i].style.height = event.data.height + "px";
        break;
      }
    }
  });
})();
