
const vscode = acquireVsCodeApi();

vscode.postMessage({
    command: 'send',
    text: 'LOADED'
});


document.getElementById("connName").value = 'LOL';
// document.getElementById("env");
// envSel.options[envSel.selectedIndex].value;
// document.getElementById("userName").value;
// document.getElementById("userPass").value;
// document.getElementById("connString").value;

var connName = window.getElementById("connName").value;
// var envSel = document.getElementById("env");
// var envValue = envSel.options[envSel.selectedIndex].value;
// var userName = document.getElementById("userName").value;
// var userPass = document.getElementById("userPass").value;
// var connString = document.getElementById("connString").value;

vscode.postMessage({
    command: 'send',
    // text: `${connName};${envValue};${userName};${userPass};${connString}; LOL`
    text: `${connName};`

});
