/*
 * @Author: mikey.zhaopeng
 * @Date:   2016-07-29 15:57:29
 * @Last Modified by: caoweiju
 * @Last Modified time: 2019-10-12 16:31:37
 */

var vscode = require('vscode');
var strftime = require('strftime');


function activate(context) {
    var config = vscode.workspace.getConfiguration('fileheader');
    console.log('"vscode-fileheader" is now active!');
    var disposable = vscode.commands.registerCommand('extension.fileheader', function () {
        config = vscode.workspace.getConfiguration('fileheader');
        var editor = vscode.editor || vscode.window.activeTextEditor;

        /*
        * @Author: huangyuan
        * @Date: 2017-02-28 17:51:35
        * @Last Modified by:   huangyuan413026@163.com
        * @Last Modified time: 2017-02-28 17:51:35
        * @description: 在当前行插入,而非在首行插入
        */

        var line = editor.selection.active.line;
        editor.edit(function (editBuilder) {
            var time = strftime(config.DateString);
            var data = {
                author: config.Author,
                lastModifiedBy: config.LastModifiedBy,
                createTime: time,
                updateTime: time
            };
            for (const key in config.Items) {
                data[key] = config.Items[key];
            }
            try {
                var tpl = new template(config.tpl).render(data);;
                editBuilder.insert(new vscode.Position(line, 0), tpl);
            } catch (error) {
                console.error(error);
            }

        });

    });

    context.subscriptions.push(disposable);

    vscode.workspace.onWillSaveTextDocument(function (file) {
        config = vscode.workspace.getConfiguration('fileheader');


        try {
            var f = file;
            var editor = vscode.editor || vscode.window.activeTextEditor;
            var document = editor.document;
            var isReturn = false;
            var authorRange = null;
            var authorText = null;
            var lastTimeRange = null;
            var lastTimeText = null;
            var lineCount = document.lineCount;
            var comment = false;

            for (var i = 0; i < lineCount; i++) {
                var linetAt = document.lineAt(i);

                var lineTextOriginal = linetAt.text;
                var line = linetAt.text;
                line = line.trim();
                if (line.startsWith("/*") && !line.endsWith("*/")) {//是否以 /* 开头
                    comment = true;//表示开始进入注释
                } else if (comment) {
                    if (line.endsWith("*/")) {
                        comment = false;//结束注释
                    }
                    var range = linetAt.range;
                    if (line.indexOf('@Last\ Modified\ by') > -1) {//表示是修改人
                        var replaceAuthorReg = /^(.*?)(@Last Modified by:)(\s*)(\S*)$/;
                        authorRange = range;
                        if (replaceAuthorReg.test(lineTextOriginal)) {
                            authorText = lineTextOriginal.replace(replaceAuthorReg, function (match, p1, p2, p3) {
                                return p1 + p2 + p3 + config.LastModifiedBy;
                            });
                        } else {
                            authorText = ' * @Last Modified by: ' + config.LastModifiedBy;
                        }
                    } else if (line.indexOf('@Last\ Modified\ time') > -1) {//最后修改时间
                        var replaceTimeReg = /^(.*?)(@Last Modified time:)(\s*)(.*)$/;
                        lastTimeRange = range;
                        var currTimeFormate = strftime(config.DateString);
                        if (replaceTimeReg.test(lineTextOriginal)) {
                            lastTimeText = lineTextOriginal.replace(replaceTimeReg, function (match, p1, p2, p3) {
                                return p1 + p2 + p3 + currTimeFormate;
                            });
                        } else {
                            lastTimeText = ' * @Last Modified time: ' + currTimeFormate;
                        }
                    }
                    if (!comment) {
                        break;//结束
                    }
                }
            }
            if ((authorRange != null) && (lastTimeRange != null)) {

                editor.edit(function (edit) {
                    edit.replace(authorRange, authorText);
                    edit.replace(lastTimeRange, lastTimeText);
                });

            }

        } catch (error) {
            console.error(error);
        }

    });
}

function getConfiguration() {
    return vscode.workspace.getConfiguration('mocha');
}



function getLineText(lineNum, editor) {
    const document = editor.document;
    if (lineNum >= document.lineCount) {
        return '';
    }
    const start = new vscode.Position(lineNum, 0);
    const lastLine = document.lineAt(lineNum);
    const end = new vscode.Position(lineNum, lastLine.text.length);
    const range = new vscode.Range(start, end);
    var t = document.getText(range);
    return t;
}

function replaceLineText(lineNum, text, editor) {
    const document = editor.document;
    if (lineNum >= document.lineCount) {
        return '';
    }
    const start = new vscode.Position(lineNum, 0);
    const lastLine = document.lineAt(lineNum);
    const end = new vscode.Position(lineNum, lastLine.text.length);
    const range = new vscode.Range(start, end);
    editor.edit(function (edit) {
        edit.replace(range, text);
    });

}



/**
 * template engine
 */
function template(tpl) {
    var
        fn,
        match,
        code = ['var r=[];\nvar _html = function (str) { return str.replace(/&/g, \'&amp;\').replace(/"/g, \'&quot;\').replace(/\'/g, \'&#39;\').replace(/</g, \'&lt;\').replace(/>/g, \'&gt;\'); };'],
        re = /\{\s*([a-zA-Z\.\_0-9()]+)(\s*\|\s*safe)?\s*\}/m,
        addLine = function (text) {
            code.push('r.push(\'' + text.replace(/\'/g, '\\\'').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '\');');
        };
    while (match = re.exec(tpl)) {
        if (match.index > 0) {
            addLine(tpl.slice(0, match.index));
        }
        if (match[2]) {
            code.push('r.push(String(this.' + match[1] + '));');
        }
        else {
            code.push('r.push(_html(String(this.' + match[1] + ')));');
        }
        tpl = tpl.substring(match.index + match[0].length);
    }
    addLine(tpl);
    code.push('return r.join(\'\');');
    fn = new Function(code.join('\n'));
    this.render = function (model) {
        return fn.apply(model);
    };
}


exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;
