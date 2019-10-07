(function () {
    const vscode = acquireVsCodeApi();

    window.onsubmit = function () {

        var connName = document.getElementById("connName").value;
        var envSel = document.getElementById("env");
        var envValue = envSel.options[envSel.selectedIndex].value;
        var userName = document.getElementById("userName").value;
        var userPass = document.getElementById("userPass").value;
        var connString = document.getElementById("connString").value;

        vscode.postMessage({
            command: 'send',
            text: `${connName};${envValue};${userName};${userPass};${connString}`
        });
    }

}());