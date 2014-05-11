/// <reference path="../../typings/atom/atom.d.ts" />
/// <reference path="../../typings/emissary/emissary.d.ts" />
/// <reference path="../../typings/text-buffer/text-buffer.d.ts" />

/// <reference path="../../node_modules/review.js/dist/review.js.d.ts" />

// check this https://github.com/yujinakayama/atom-lint/blob/master/lib/lint-runner.coffee

import emissaryHelper = require("./emissary-helper");
import V = require("./const");

import ReVIEW = require("review.js");

class ReVIEWRunner extends emissaryHelper.EmitterSubscriberBase {

	buffer:TextBuffer.ITextBuffer;
	grammerChangeSubscription:Emissary.ISubscription;
	wasAlreadyActivated:boolean;
	bufferSubscription:Emissary.ISubscription;

	lastAcceptableSyntaxes:ReVIEW.Build.AcceptableSyntaxes;
	lastSymbols:ReVIEW.ISymbol[];
	lastReports:ReVIEW.ProcessReport[];
	lastBook:ReVIEW.Book;

	constructor(public editor:AtomCore.IEditor) {
		super();
		this.buffer = editor.getBuffer();
	}

	startWatching():void {
		console.log("debug ReVIEWRunner startWatching");
		if (this.grammerChangeSubscription) {
			return;
		}

		this.configureRunner();

		this.grammerChangeSubscription = this.subscribe(this.editor, "grammar-changed", ()=> {
			this.configureRunner();
		});
	}

	stopWatching():void {
		console.log("debug ReVIEWRunner stopWatching");
		if (!this.grammerChangeSubscription) {
			return;
		}

		this.grammerChangeSubscription.off();
		this.grammerChangeSubscription = null;
	}

	configureRunner():void {
		var scopeName = this.editor.getGrammar().scopeName;
		console.log("debug ReVIEWRunner configureRunner grammar " + scopeName);
		if (V.reviewScopeName === scopeName) {
			this.activate();
		} else {
			this.deactivate();
		}
	}

	activate():void {
		console.log("debug ReVIEWRunner activate");
		if (!this.wasAlreadyActivated) {
			this.emit("activate");
		}
		this.doCompile();
		if (this.bufferSubscription) {
			return;
		}
		this.bufferSubscription = this.subscribe(this.buffer, "saved reloaded", ()=> {
			this.doCompile();
		});
	}

	deactivate():void {
		console.log("debug ReVIEWRunner deactivate");
		if (this.bufferSubscription) {
			this.bufferSubscription.off();
			this.bufferSubscription = null;
		}
		this.emit("deactivate");
	}

	on(eventNames:"syntax", callback:(acceptableSyntaxes:ReVIEW.Build.AcceptableSyntaxes)=>any):any;

	on(eventNames:"symbol", callback:(symbols:ReVIEW.ISymbol[])=>any):any;

	on(eventNames:"report", callback:(reports:ReVIEW.ProcessReport[])=>any):any;

	on(eventNames:"compile-success", callback:(book:ReVIEW.Book)=>any):any;

	on(eventNames:"compile-failed", callback:()=>any):any;

	on(eventNames:string, handler:Function):any;

	// 後でReVIEWRunner.emissarified();している。特殊化されたオーバーロードのため。
	on(eventNames:string, handler:Function):any {
		throw new Error();
	}

	doCompile():void {
		console.log("debug ReVIEWRunner doCompile");

		var files:{[path:string]:string;} = {
			"ch01.re": this.editor.buffer.getText()
		};
		var result:{[path:string]:string;} = {
		};
		ReVIEW.start(review => {
			review.initConfig({
				read: path => files[path],
				write: (path, content) => result[path] = content,
				listener: {
					onAcceptables: acceptableSyntaxes => {
						console.log("onAcceptables", acceptableSyntaxes);
						this.lastAcceptableSyntaxes = acceptableSyntaxes;
						this.emit("syntax", acceptableSyntaxes);
					},
					onSymbols: symbols => {
						console.log("onSymbols", symbols);
						this.lastSymbols = symbols;
						this.emit("symbol", symbols);
					},
					onReports: reports => {
						console.log("onReports", reports);
						this.lastReports = reports;
						this.emit("report", reports);
					},
					onCompileSuccess: book => {
						console.log("onCompileSuccess", book);
						this.lastBook = book;
						this.emit("compile-success", book);
					},
					onCompileFailed: () => {
						console.log("onCompileFailed");
						this.lastBook = null;
						this.emit("compile-failed");
					}
				},
				builders: [new ReVIEW.Build.HtmlBuilder(false)],
				book: {
					preface: [],
					chapters: [
						"ch01.re"
					],
					afterword: []
				}
			});
		});
	}

	get filePath():string {
		return this.buffer.getUri();
	}
}
ReVIEWRunner.emissarified();

export = ReVIEWRunner;
