"use strict"; // Defines that JavaScript code should be executed in "strict mode".
// SIMATIC S7 PLC Controller Framework - using jQuery Framework
// bastian.geier@siemens.com , Siemens AG

var S7Framework = (function ($, undefined) {
	var version = "0.1.29";
	// type of variable - 0=Bool, 1=unsigned INT, 2=signed INT, 3=real, 4=LReal, 5=String, 10=DateAndTime
	var BOOL = 0, UINT = 1, INT = 2, REAL = 3, LREAL = 4, STRING = 5, DATE_AND_TIME = 10;
	var DEBUG = false;
	var initialized = false;
	var initializedRetVal = false;
	// CPU Type for different functions
	var _plcType = null;
	// Diagnostic tags
	var diagElements = {};
	var diagInitialized = false;
	//AlarmTags
	var urlAlarmTable = "";
	var alarmElements = {};
	var alarmInitialized = false;
	var MultiUseToken = "";
	var firstRetVal;
	// state tags for referrer
	var prevState;
	var prevTitle;
	var prevUrl;

	// Data model Diagnostic
	function loadDiagDetail(detailStr) {
		if (_plcType == "1200") {
			// eventcount, eventnumber, eventid, eventdata, time, date
			// "'50','8','02:400C','7','23:28:47:885','06.01.2012'"
			//console.log("String bevor :=", detailStr );
			var detailStr = detailStr.replace(/"|'|\s/g, "");
			//console.log("String after :=", detailStr );
			var detailStr = detailStr.split(",");
			//console.log("Array after  :=", detailStr );
			var eventcount = detailStr[0];
			var eventnumber = detailStr[1];
			var eventid = detailStr[2];
			var eventdata = detailStr[3];
		}
		else if (_plcType == "1500") {
			// eventnumber, eventid, eventdata, time, date
			// "'2','02:400E','0020+0001+0F00+0E40+010C+00406600+0010+3400+0200+0000+00000604+0120+0F00+1414+1414+C51C+75D0+0E40+010C+6','14:43:56.179','07.11.2015'"
			//console.log("String bevor :=", detailStr );
			var detailStr = detailStr.replace(/"|'|\s/g, "");
			//console.log("String after :=", detailStr );
			var detailStr = detailStr.split(",");
			var eventnumber = detailStr[0];
			var eventid = detailStr[1];
			var eventdata = detailStr[2];

			var script = $(diagElements.pages.diagTableDiv + "> table tbody tr:first script").html();
			//console.info( script );
			var start = script.indexOf("var eventcount=");
			start = script.indexOf("=", start) + 1;
			var end = script.indexOf(";", start);

			var eventcount = parseInt(script.slice(start, end), 10);

			var eventcount = detailStr[0];
		}
		else {
			console.error("Wrong PLC Type given to S7Framework.initialize('plcType','');");
			return false;
		}

		var linkDetail = '/ClientArea/DiagDetail.mwsl';
		linkDetail += ('?EventNumber=' + eventnumber + '&EventID=' + eventid + '&EventData=' + eventdata) + ((eventcount != "") ? ('&EventCount=' + eventcount) : "");

		var linkDetailLong = '/ClientArea/DiagLong.mwsl';
		linkDetailLong += '?EventNumber=' + eventnumber + '&EventData=' + eventdata;

		$.get(location.origin + linkDetail, "")
			.done(function (ret_val) { // .complete
				//console.log(ret_val);
				var div = $('<div/>').html(ret_val);
				// in case of new firmware V2.0.1 we don't need to make another call
				if (div.find("#EventLongText").length > 0) {
					$(diagElements.pages.diagDetail.No).html("Detail No.: " + eventnumber);
					$(diagElements.pages.diagDetail.EventID).html("Event-ID: 16# " + eventid);
					$(diagElements.pages.diagDetail.Text).html(div.find("#EventLongText").html());
				}
				else {
					// set referrer to main entry page of web-server --> Portal.mwsl
					if (location.origin != "null" && location.origin != "file://") {
						history.pushState({ MyObj: "PriNav" }, "PriNav", linkDetail);
					}
					$.get(location.origin + linkDetailLong, "")
						.done(function (ret_val) { // .complete
							//console.log(ret_val);

							var div = $('<div/>').html(ret_val)
							var diagLongText = "";

							if (_plcType == "1200") {
								diagLongText = div.find("#diagLongTextDiv").html();
								if (diagLongText == undefined)
									diagLongText = div.find(".ContentLongText").parent().html();
							}
							else if (_plcType == "1500") {
								diagLongText = div.find("td").html();
							}
							else {
								console.error("Wrong PLC Type given to S7Framework.initialize('plcType','');");
								return false;
							}

							$(diagElements.pages.diagDetail.No).html("Detail No.: " + eventnumber);
							$(diagElements.pages.diagDetail.EventID).html("Event-ID: 16# " + eventid);
							$(diagElements.pages.diagDetail.Text).html(diagLongText);
						});
					history.replaceState(prevState, prevTitle, prevUrl);
				}
			});
		history.replaceState(prevState, prevTitle, prevUrl);
	}

	function loadDiagTable(index) {
		// set referrer to main entry page of web-server --> Portal.mwsl
		if (location.origin != "null" && location.origin != "file://") {
			history.pushState({ MyObj: "PriNav" }, "PriNav", location.origin + "/Portal/Portal.mwsl?PriNav=Diag");
		}
		// calculate start and end index
		var res;
		var start = 0;
		var end = 0;
		var url = "";

		if (_plcType == "1200" && index.includes("ThrNav")) {
			// build URL
			url = location.origin + "/ClientArea/DiagTable.mwsl?" + index;
		}
		else if (_plcType == "1200" && index.includes("Diag")) {
			res = parseInt(index.replace("Diag", ""));
			start = (res - 1) * 25 + 1;
			end = res * 25;
			// build URL
			url = location.origin + "/ClientArea/DiagTable.mwsl?Start=" + start + "&End=" + end;
		}
		else if (_plcType == "1500" && index.includes("Diag")) {
			res = parseInt(index.replace("Diag", ""));
			start = (res - 1) * 50 + 1;
			end = res * 50;
			// build URL
			url = location.origin + "/ClientArea/DiagTable.mwsl?Start=" + start + "&End=" + end;
		}
		else {
			console.error("Wrong PLC Type given to S7Framework.initialize('plcType','');");
			return false;
		}

		$.get(url, "", function (ret_val) { })
			.done(function (ret_val) { // .complete
				// create temp HTML element
				var div = $('<div/>').html(ret_val)
				var table = null;

				if (_plcType == "1200") {
					table = div.find("#updateDiagDiv").html();
					if (table == null)
						table = div.find("#diag_table").parent().html();
				}
				else if (_plcType == "1500") {
					table = div.find("#UpdateDiagDiv").html();
				}
				else {
					console.error("Wrong PLC Type given to S7Framework.initialize('plcType','');");
					return false;
				}

				$(diagElements.pages.diagTableDiv).html(table);
				if ($(diagElements.pages.diagTable.onclick).length > 0) {
					$(diagElements.pages.diagTable.onclick).each(function () {
						if ($(this).attr("onClick") == undefined) return true;
						var tOnclickAtt = $(this).attr("onclick");
						tOnclickAtt = tOnclickAtt.replace("SelectRow(", "");
						tOnclickAtt = tOnclickAtt.replace(")", "");
						//$(this).removeAttr("onclick").data("diag", tOnclickAtt);
						$(this).removeAttr("onclick").attr('data-diag', tOnclickAtt);

						// Event handler for Table Row ONCLICK diagnostic page
						$(diagElements.pages.diagTable.data).off();
						$(diagElements.pages.diagTable.data).click(function () {
							$(diagElements.pages.diagTable.selected).removeAttr("id").removeClass("rowSelected").addClass("rowVisited");
							$(this).removeClass("rowNonselected rowVisited").addClass("rowSelected").attr('id', 'rowSelected');

							var detailStr = $(this).attr('data-diag');
							//console.log("Click on TR", detailStr );
							loadDiagDetail(detailStr);
						});
					});
					$(diagElements.pages.diagTable.data).first().trigger("click");
				}
				else {
					$(diagElements.pages.diagTableDiv + "> table.ContentTable").off();
					$(diagElements.pages.diagTableDiv + "> table.ContentTable tbody tr[data-event-number]").each(function () {
						$(this).click(function () {
							$(diagElements.pages.diagTableDiv + "> table.ContentTable tbody tr[id=rowSelected]").removeAttr("id").removeClass("rowSelected").addClass("rowVisited");
							$(this).removeClass("rowNonselected rowVisited").addClass("rowSelected").attr('id', 'rowSelected');
							// eventcount, eventnumber, eventid, eventdata, time, date
							// "'50','8','02:400C','7','23:28:47:885','06.01.2012'"
							// <tr class="table_row" data-event-number="4" data-event-id="02:4000" data-event-data="0240001264FA18DE8FE1F801">
							var detailStr = " ," + $(this).attr('data-event-number') + "," + $(this).attr('data-event-id') + "," + $(this).attr('data-event-data');
							//console.log("Click on TR", detailStr );
							loadDiagDetail(detailStr);
						});
					});

					$(diagElements.pages.diagTableDiv + "> table.ContentTable tbody tr[data-event-number]").first().trigger("click");
				}
			});
		history.replaceState(prevState, prevTitle, prevUrl);
	}

	function loadDiagMain() {
		// set referrer to main entry page of web-server --> Portal.mwsl
		if (location.origin != "null" && location.origin != "file://") {
			history.pushState({ MyObj: "PriNav" }, "PriNav", location.origin + "/Portal/Portal.mwsl?PriNav=Diag");
		}
		// load start information, how many diagnostic entry are stored in the PLC
		$.get(location.origin + "/Portal/Portal.mwsl?PriNav=Diag", "", function (ret_val) { })
			.done(function (ret_val) { // .complete
				//console.log(ret_val);
				var div = $('<div/>').html(ret_val);
				var options = div.find("select[name=ThrNav]").html();
				//console.log(options);
				$(diagElements.pages.diagSelector).html(options);
				$(diagElements.pages.diagSelector).find("option").each(function () {
					var str = $(this).val();
					var res;
					if (str.includes("Diag"))
						res = str.replace("DiagTable", "Diag");
					else
						res = "ThrNav=" + str;

					$(this).val(res);
				});
				// first call start index is ONE
				loadDiagTable($(diagElements.pages.diagSelector).val());
			});
		history.replaceState(prevState, prevTitle, prevUrl);
	}

	// React on change events in diagnostic view and refreshes
	function diagView() {
		var _self = this;

		_self.resize = function () {
			/*
			elements.container.outerWidth( elements.container.parent().width() - 20 );
			elements.container.outerHeight( elements.container.parent().height() - 30 );

			elements.pages.diagnose.iframeTable.width( elements.container.width() - 0 );
			elements.pages.diagnose.iframeTable.height( elements.container.height() - 0 );
			*/
		} // resize
	} // Data model Diagnostic

	// Data model Alarms
	function acknowledgeAlarm(ack_id) {
		// store actual URL
		var prevState = history.state;
		var prevTitle = document.title;
		var prevUrl = location.href;
		// set URL Origin to ALARM Page for referrer
		if (location.origin != "null" && location.origin != "file://") {
			history.pushState({ MyObj: "PriNav" }, "PriNav", urlAlarmTable);
		}
		// just if we found a multiuse token before.....
		if (MultiUseToken != "") {
			MultiUseToken = "MultiUseToken=" + encodeURIComponent(MultiUseToken);
		}
		// build data Acknowledge
		var ack = "&AckId=" + ack_id;

		var indexAlarm = $(alarmElements.pages.alarmSelector).val();
		var endAlarm = parseInt(indexAlarm.replace("Alarm", ""));
		endAlarm = endAlarm * 50;
		// build data END
		endAlarm = "&End=" + endAlarm;

		var data = MultiUseToken + ack + endAlarm;

		$.post("/Alarms/Acknowledge", data)
			.done(function (ret_val) {
				setTimeout(function () { loadAlarmMain(); }, 500);
			});
		// reset URL / referrer
		//history.pushState(prevState, prevTitle, prevUrl);
		history.replaceState(prevState, prevTitle, prevUrl);
	}

	function loadAlarmDetail(detailStr) {
		if (_plcType == "1500") {
			// eventnumber, eventid, eventdata, time, date
			// "'2','02:400E','0020+0001+0F00+0E40+010C+00406600+0010+3400+0200+0000+00000604+0120+0F00+1414+1414+C51C+75D0+0E40+010C+6','14:43:56.179','07.11.2015'"
			//console.log("String bevor :=", detailStr );
			var detailStr = detailStr.replace(/"|'|\s/g, "");
			//console.log("String after :=", detailStr );
			var detailStr = detailStr.split(",");
			//console.log("Array after  :=", detailStr );
			var eventnumber = detailStr[0];
			var eventid = detailStr[1];
			var eventdata = detailStr[2];
			var alarmtype = detailStr[3];

			var script = $(alarmElements.pages.alarmTableDiv + "> table tbody tr:first script").html();

			//var start = script.indexOf("var eventcount=");
			//	start = script.indexOf("=", start) + 1;
			//var end = script.indexOf(";", start);

			var start = firstRetVal.indexOf("var eventcount=");
			start = firstRetVal.indexOf("=", start) + 1;
			var end = firstRetVal.indexOf(";", start);

			var eventcount = parseInt(firstRetVal.slice(start, end), 10);
			//var eventcount = parseInt( script.slice(start,end), 10 );

			var eventcount = detailStr[0];
		}
		else {
			console.error("Wrong PLC Type given to S7Framework.initialize('plcType','');");
			return false;
		}

		var linkDetail = '/ClientArea/AlarmDetail.mwsl';
		linkDetail += '?EventNumber=' + eventnumber + '&EventID=' + eventid + '&EventData=' + eventdata + ((eventcount != "") ? ('&EventCount=' + eventcount) : "") + "&AlarmType=" + alarmtype;

		var linkDetailLong = '/ClientArea/AlarmLong.mwsl';
		linkDetailLong += '?EventData=&AlarmType=' + alarmtype + '&EventID=' + eventid;

		$.get(location.origin + linkDetail, "")
			.done(function (ret_val) { // .complete
				//console.log(ret_val);
				var div = $('<div/>').html(ret_val);
				// in case of new firmware V2.0.1 we don't need to make another call :-)
				if (div.find("#AlarmInfoText").length > 0) {
					$(alarmElements.pages.alarmDetail.No).html("Details on alarm number: " + eventnumber);
					$(alarmElements.pages.alarmDetail.EventID).html("Event-ID: 16# " + eventid);
					$(alarmElements.pages.alarmDetail.Text).html(div.find("#AlarmInfoText").html());
				}
				else {
					// set referrer to main entry page of web-server --> Portal.mwsl
					if (location.origin != "null" && location.origin != "file://") {
						history.pushState({ MyObj: "PriNav" }, "PriNav", linkDetail);
					}
					$.get(location.origin + linkDetailLong, "")
						.done(function (ret_val) { // .complete
							//console.log(ret_val);

							var div = $('<div/>').html(ret_val)
							var alarmLongText = "";

							if (_plcType == "1500") {
								alarmLongText = div.find("#AlarmInfoText").html();
							}
							else {
								console.error("Wrong PLC Type given to S7Framework.initialize('plcType','');");
								return false;
							}

							$(alarmElements.pages.alarmDetail.No).html("Detail on Alarm No.: " + eventnumber);
							$(alarmElements.pages.alarmDetail.EventID).html("Event-ID: 16# " + eventid);
							$(alarmElements.pages.alarmDetail.Text).html(alarmLongText);
						});
					history.replaceState(prevState, prevTitle, prevUrl);
				}
			});
		history.replaceState(prevState, prevTitle, prevUrl);
	}

	function loadAlarmTable() {
		// set referrer to main entry page of web-server --> Portal.mwsl
		if (location.origin != "null" && location.origin != "file://") {
			history.pushState({ MyObj: "PriNav" }, "PriNav", location.origin + "/Portal/Portal.mwsl?PriNav=Alarm");
		}
		// calculate start and end index
		var res;
		var start = 0;
		var end = 0;
		var indexAlarm = $(alarmElements.pages.alarmSelector).val();
		if (_plcType == "1500" && indexAlarm.includes("Alarm")) {
			res = parseInt(indexAlarm.replace("Alarm", ""));
			start = (res - 1) * 50 + 1;
			end = res * 50;
			// build URL
			urlAlarmTable = location.origin + "/ClientArea/AlarmTable.mwsl?Start=" + start + "&End=" + end;
		}
		else {
			console.error("Wrong PLC Type given to S7Framework.initialize('plcType','');");
			return false;
		}

		$.get(urlAlarmTable, "")
			.done(function (ret_val) { // .complete
				// create temp HTML element
				var div = $('<div/>').html(ret_val)
				var table = null;
				var token = null;

				if (_plcType == "1500") {
					table = div.find("#UpdateAlarmDiv").html();
					if (div.find("#var_tok input"))
						token = div.find("#var_tok input").val();
					if (token != "")
						MultiUseToken = token;

					firstRetVal = ret_val;
					var scriptRead = div.find("script.alarmtablebody").html;//go_on
				}
				else {
					console.error("Wrong PLC Type given to S7Framework.initialize('plcType','');");
					return false;
				}
				$(alarmElements.pages.alarmTableDiv).html(table);
				//$(alarmElements.pages.alarmTable.tr).last().hide();
				$(alarmElements.pages.alarmTable.a).removeAttr('href'); // delete link
				if ($(alarmElements.pages.alarmTable.onclick).length > 0) {
					$(alarmElements.pages.alarmTable.onclick).each(function () {
						if ($(this).attr("onClick") == undefined) return true;
						var tOnclickAtt = $(this).attr("onclick");
						tOnclickAtt = tOnclickAtt.replace("SelectRow(", "");
						tOnclickAtt = tOnclickAtt.replace(")", "");
						//$(this).removeAttr("onclick").data("alarm", tOnclickAtt);
						$(this).removeAttr("onclick").attr('data-alarm', tOnclickAtt);

						// Event handler for Table Row ONCLICK alarm page
						$(alarmElements.pages.alarmTable.data).off();
						$(alarmElements.pages.alarmTable.data).click(function () {
							$(alarmElements.pages.alarmTable.selected).removeAttr("id").removeClass("rowSelected").addClass("rowVisited");
							$(this).removeClass("rowNonselected rowVisited").addClass("rowSelected").attr('id', 'rowSelected');

							var detailStr = $(this).attr('data-alarm');
							//console.log("Click on TR", detailStr );
							loadAlarmDetail(detailStr);
						});
					});
					$(alarmElements.pages.alarmTable.data).first().trigger("click");
				}
				else {
					$(alarmElements.pages.alarmTableDiv + "> table.ContentTable").off();
					$(alarmElements.pages.alarmTableDiv + "> table.ContentTable tbody tr[data-event-number]").each(function () {
						$(this).click(function () {
							$(alarmElements.pages.alarmTableDiv + "> table.ContentTable tbody tr[id=rowSelected]").removeAttr("id").removeClass("rowSelected").addClass("rowVisited");
							$(this).removeClass("rowNonselected rowVisited").addClass("rowSelected").attr('id', 'rowSelected');
							// eventcount, eventnumber, eventid, eventdata, time, date
							// "'50','8','02:400C','7','23:28:47:885','06.01.2012'"
							// <tr class="table_row" data-event-number="4" data-event-id="02:4000" data-event-data="0240001264FA18DE8FE1F801">
							var detailStr = " ," + $(this).attr('data-event-number') + "," + $(this).attr('data-event-id') + "," + $(this).attr('data-event-data');
							//console.log("Click on TR", detailStr );
							loadAlarmDetail(detailStr);
						});
					});

					$(alarmElements.pages.alarmTableDiv + "> table.ContentTable tbody tr[data-event-number]").first().trigger("click");
				}

				$(alarmElements.pages.alarmTable.btn).each(function () {
					$(this).prop('onclick', null)
						.off()
						.removeAttr('onclick');
					$(this).click(function () {
						var value = $(this).closest("tr").find("td:nth-child(2)").text();
						acknowledgeAlarm(value);

					});
				});
			});
		history.replaceState(prevState, prevTitle, prevUrl);
	}

	function loadAlarmMain() {
		// set referrer to main entry page of web-server --> Portal.mwsl
		if (location.origin != "null" && location.origin != "file://") {
			history.pushState({ MyObj: "PriNav" }, "PriNav", location.origin + "/Portal/Portal.mwsl?PriNav=Alarm");
		}
		// load start information, how many alarm entry's are stored in the PLC
		$.get(location.origin + "/Portal/Portal.mwsl?PriNav=Alarm", "", function (ret_val) { })
			.done(function (ret_val) { // .complete
				//console.log(ret_val);
				var div = $('<div/>').html(ret_val);
				var options = div.find("select[name=ThrNav]").html();
				//console.log(options);
				$(alarmElements.pages.alarmSelector).html(options);
				$(alarmElements.pages.alarmSelector).find("option").each(function () {
					var str = $(this).val();
					var res;
					if (str.includes("Alarm"))
						res = str.replace("AlarmTable", "Alarm");
					else
						res = "ThrNav=" + str;

					$(this).val(res);
				});
				// first call start index is ONE

				if ($(alarmElements.pages.alarmSelector).val() != null) {
					loadAlarmTable($(alarmElements.pages.alarmSelector).val());
				}
				else {
					return;
				}

			});
		history.replaceState(prevState, prevTitle, prevUrl);
	}

	// React on change events in alarm view and refreshes
	function alarmView() {
		var _self = this;

		_self.resize = function () {
			/*
			elements.container.outerWidth( elements.container.parent().width() - 20 );
			elements.container.outerHeight( elements.container.parent().height() - 30 );

			elements.pages.diagnose.iframeTable.width( elements.container.width() - 0 );
			elements.pages.diagnose.iframeTable.height( elements.container.height() - 0 );
			*/
		} // resize
	} // Data model Alarms

	// general functions
	function htmlDecodeEntities(value) {
		return (typeof value === 'undefined') ? '' : $('<div/>').html(value).text();
	}

	function strTrim(x) {
		return x.replace(/^\s+|\s+$/gm, '');
	}
	// general functions

	// decode ASCII coded string transfer
	function convString(DATA, LEN, TYPE, STR, ERROR) {
		var i = 0, j = 0;
		var values = [];
		// remove every form of white space
		DATA = htmlDecodeEntities(DATA);
		DATA = DATA.replace(/"|'|\s/g, "");
		LEN = LEN.replace(/"|'|\s/g, "");
		TYPE = TYPE.replace(/"|'|\s/g, "");
		STR = htmlDecodeEntities(STR);
		STR = STR.replace(/"|'|\s/g, "");
		console.assert(!DEBUG, "CONV Items:=", DATA, LEN, TYPE, STR);
		LEN = LEN.split(";");
		TYPE = TYPE.split(";");
		STR = STR.split(";");
		// convert LEN & TYPE to integer
		while (i < LEN.length) {
			LEN[i] = parseInt(LEN[i], 10);
			TYPE[i] = parseInt(TYPE[i], 10);
			i++;
		}
		i = 0;
		// loop trough string, disassembly and extract content
		while ((j < DATA.length) && (i < LEN.length)) {
			values[i] = (TYPE[i] != 5) ? convAsciiToHex(DATA.substr(j, LEN[i]), LEN[i]) : DATA.substr(j, LEN[i]);
			console.assert(!DEBUG, "Decode string part :=", i, values[i], TYPE[i]);
			switch (TYPE[i]) {
				case 0: // BOOL
					values[i] = hexToBool(values[i]);
					break;
				case 1: // INT
				case 2: // INT
					values[i] = hexToInt(values[i], TYPE[i], LEN[i]);
					break;
				case 3: // Real
					values[i] = hexToReal(values[i]);
					break;
				case 4: // LReal
					//values[i] = hexToLReal(values[i]);
					values[i] = hexToLongFloat(DATA.substr(j, LEN[i]));
					break;
				case 5: // String
					// nothing to do
					break;
				case 10: // Date and time
					// len == 22 !!! // 24 incl. Weekday, done by JavaScript :-)
					values[i] = hexToDateAndTime(DATA.substr(j, LEN[i]));
					break;
				default:
					console.error("Type input failure in function -convString()- @ index" + i + "\n" + ERROR);
					break;
			}
			j += LEN[i];
			i++;
		}
		for (var index in STR) {
			values[i] = STR[index];
			i++;
		}
		return values
	}

	function convAsciiToHex(ASCII, N) {
		var result = 0;
		var zeichen = 0;
		for (var i = 0; i < N; i++) {
			if (('0' <= ASCII[i]) && (ASCII[i] <= '9')) {
				zeichen = ASCII.charCodeAt(i) - 48;
			}
			else if (('A' <= ASCII[i]) && (ASCII[i] <= 'F')) {
				zeichen = ASCII.charCodeAt(i) - 55;
			}
			else if (('a' <= ASCII[i]) && (ASCII[i] <= 'f')) {
				zeichen = ASCII.charCodeAt(i) - 87;
			}
			else {
				console.error("Character Failure = -" + ASCII + "-, " + N);
				//alert("Character Failure = -" + ASCII + "-, " + N);
				return Math.NaN;
			}
			result += zeichen * Math.pow(16, N - 1 - i);
		}
		return result;
	}

	function hexToBool(t_Bool) {
		return (t_Bool === "1" || t_Bool === 1 || t_Bool === true) ? true : false;
	}

	function hexToInt(number, TYPE, LEN) {
		var sign = 0;
		switch (TYPE) {
			case 1: // UNSigned INT
				//alert("UInt");
				return number;
				break;
			case 2: // Signed INT
				//alert("Int");
				switch (LEN) {
					case 2: // 8Bit Signed SINT
						sign = (number & 0x80) ? 1 : 0;
						return (number & 0x7F) - sign * 128;
					case 4: // 16Bit Signed INT
						sign = (number & 0x8000) ? 1 : 0;
						return (number & 0x7FFF) - sign * 32768;
					case 8: // 32Bit Signed DINT
						sign = (number & 0x80000000) ? 1 : 0;
						return (number & 0x7FFFFFFF) - sign * 2147483648;
					case 16: // 64Bit Signed LINT
						sign = (number & 0x8000000000000000) ? 1 : 0;
						return (number & 0x7FFFFFFFFFFFFFFF) - sign * 9223372036854775808;
					default:
						console.error("Type INT LENGTH input failure, number, type, lenght := ", number, TYPE, LEN);
						//alert("Type INT LENGTH input failure");
						return Number.NaN;
				}
			default:
				console.error("Type input failure number, type, lenght := ", number, TYPE, LEN);
				//alert("Type input failure");
				return Number.NaN;
		}
	}

	function hexToReal(number) { // 32 Bit - single precision -- just for normalized numbers
		var sign = (number & 0x80000000);		// sign: 0=positive
		var exponent = (number & 0x7F800000) >> 23;	// exponent
		var mantissa = (number & 0x007FFFFF);		// mantissa

		if (exponent == 0x0000) {									// special: zero
			if (mantissa != 0)									// positive denormalized
				return Number.NaN;
			else												// normalized numbers
				return sign ? -0.0 : +0.0;
		}
		else if (exponent == 0x00FF) {							// 255 - special: ±INF or NaN
			if (mantissa != 0) {									// is mantissa non-zero? indicates NaN
				return Number.NaN;
			}
			else {												// otherwise it's ±INF
				return sign ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
			}
		}
		mantissa |= 0x00800000;

		exponent -= 127;										// adjust by BIAS
		var float_val = mantissa * Math.pow(2, exponent - 23);			// compute absolute result
		return sign ? -float_val : +float_val;					// and return positive or negative depending on sign
	}

	function hexToLReal(number) { // 64 Bit - double prescision -- just for normalized numbers
		var sign = (number & 0x8000000000000000);		// sign: 0=positive
		//var exponent	= (number & 0x7FF0000000000000) >> 52;	// exponent
		//var exponent	= (number & 0x7FF0000000000000);	// exponent
		//var exponent	= number / Math.pow(2, 52);	// exponent
		var exponent = (number) >> 52;	// exponent
		exponent &= 0x7FF;
		var mantissa = (number & 0x000FFFFFFFFFFFFF);		// mantissa

		if (exponent == 0x0000) {									// special: zero
			if (mantissa != 0)									// positive denormalized
				return Number.NaN;
			else												// normalized numbers
				return sign ? -0.0 : +0.0;
		}
		else if (exponent == 0x07FE) {							// 2047 - special: ±INF or NaN
			if (mantissa != 0) {									// is mantissa non-zero? indicates NaN
				return Number.NaN;
			}
			else {												// otherwise it's ±INF
				return sign ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
			}
		}
		mantissa |= 0x0001000000000000;

		exponent -= 1023;										// adjust exponent by BIAS
		float_val = mantissa * Math.pow(2, exponent - 52);				// compute absolute result
		return sign ? -float_val : +float_val;					// and return positive or negative depending on sign
	}

	function hexToLongFloat(longStr) { // 64 Bit - double precision -- just for normalized numbers
		var buffer = new ArrayBuffer(8);
		var bytes = new Uint8Array(buffer);
		var doubles = new Float64Array(buffer); // not supported in Chrome

		for (var x = 0; x < 8; x++) {
			bytes[7 - x] = convAsciiToHex(longStr.substr(x * 2, x * 2 + 2), 2);
		}
		return doubles[0];
	}

	function floatToReal(number) {
		n = +number,
			status = ((n !== n) || n == -Infinity || n == +Infinity) ? n : 0,
			exp = 0,
			len = 281, // 2 * 127 + 1 + 23 + 3,
			bin = new Array(len),
			signal = (n = status !== 0 ? 0 : n) < 0,
			n = Math.abs(n),
			intPart = Math.floor(n),
			floatPart = n - intPart,
			i, lastBit, rounded, j, exponent;

		if (status !== 0) {
			if (n !== n) {
				return 0x7fc00000;
			}
			if (n === Infinity) {
				return 0x7f800000;
			}
			if (n === -Infinity) {
				return 0xff800000
			}
		}

		i = len;
		while (i) {
			bin[--i] = 0;
		}

		i = 129;
		while (intPart && i) {
			bin[--i] = intPart % 2;
			intPart = Math.floor(intPart / 2);
		}

		i = 128;
		while (floatPart > 0 && i) {
			(bin[++i] = ((floatPart *= 2) >= 1) - 0) && --floatPart;
		}

		i = -1;
		while (++i < len && !bin[i]);

		if (bin[(lastBit = 22 + (i = (exp = 128 - i) >= -126 && exp <= 127 ? i + 1 : 128 - (exp = -127))) + 1]) {
			if (!(rounded = bin[lastBit])) {
				j = lastBit + 2;
				while (!rounded && j < len) {
					rounded = bin[j++];
				}
			}

			j = lastBit + 1;
			while (rounded && --j >= 0) {
				(bin[j] = !bin[j] - 0) && (rounded = 0);
			}
		}
		i = i - 2 < 0 ? -1 : i - 3;
		while (++i < len && !bin[i]);
		((exp = 128 - i) >= -126 && exp <= 127) ? ++i : exp < -126 && (i = 255, exp = -127);
		((intPart || status !== 0) && (exp = 128, i = 129, status == -Infinity) ? signal = 1 : (status !== status) && (bin[i] = 1));

		n = Math.abs(exp + 127);
		exponent = 0;
		j = 0;
		while (j < 8) {
			exponent += (n % 2) << j;
			n >>= 1;
			j++;
		}

		var mantissa = 0;
		n = i + 23;
		for (; i < n; i++) {
			mantissa = (mantissa << 1) + bin[i];
		}
		return ((signal ? 0x80000000 : 0) + (exponent << 23) + mantissa) | 0;
	}

	function hexToDateAndTime(dateAndTimeLong) {
		// Values convert to time  -- from: "2015-09-21 12:15:00.000_000_000" to DATE Object
		var year = hexToInt(convAsciiToHex(dateAndTimeLong.substr(0, 4), 4), 1, 4);
		var month = hexToInt(convAsciiToHex(dateAndTimeLong.substr(4, 2), 2), 1, 2) - 1;
		var day = hexToInt(convAsciiToHex(dateAndTimeLong.substr(6, 2), 2), 1, 2);
		var hours = hexToInt(convAsciiToHex(dateAndTimeLong.substr(8, 2), 2), 1, 2);
		var minutes = hexToInt(convAsciiToHex(dateAndTimeLong.substr(10, 2), 2), 1, 2);
		var seconds = hexToInt(convAsciiToHex(dateAndTimeLong.substr(12, 2), 2), 1, 2);
		var milliseconds = hexToInt(convAsciiToHex(dateAndTimeLong.substr(14, 8), 8), 1, 8) / 1000000;

		var timeStamp = new Date(
			Date.UTC(
				year,			// year
				month,			// month,
				day,			// day,
				hours,			// hours,
				minutes,		// minutes,
				seconds,		// seconds,
				milliseconds	// milliseconds
			)
		);
		return timeStamp;
		//return timeStamp.getTime();
	}
	// decode ASCII coded string transfer

	// encode variable to ASCII coded string
	function varToASCIIString(VARIABLE, LEN) {
		var t_string = '';
		var t_byte = 0x00;

		while (LEN > 0) {
			t_byte = VARIABLE & 0x0F; // select last nibble
			if (t_byte < 10) { // if smaller add '0'
				t_byte += 48;
			}
			else { // if greater add 'A'
				t_byte += 55;
			}
			t_string = String.fromCharCode(t_byte) + t_string;
			VARIABLE >>= 4; // shift 4 bit right
			LEN--;
		}
		return t_string;
	}
	// encode variable to ASCII coded string

	function readWriteToPLC(URL, DATA, ERROR, CALLBACK_OK, CALLBACK_ERROR) {
		$.post(URL, DATA)
			.done(function (returnData) { // .success
				//alert("Write Data return Values: "+returnData);
				if (CALLBACK_OK != undefined && typeof CALLBACK_OK == 'function') {
					// try to parse JSON
					try {
						var obj = jQuery.parseJSON(returnData);
						if (obj.val != undefined) {
							var values = convString(obj.val, obj.len, obj.typ, obj.str, ERROR);
							CALLBACK_OK(values);
						}
						else {
							CALLBACK_OK(obj);
						}
					}
					// in case error is fired, catch and try to fix JSON formated string
					catch (e) { // .error parsing json
						// write error message into console
						console.error("Error occurred while parse JSON String data\nTRY to fix automatically\n" + e.message + "\nData:\n" + returnData);
						// try to fix JSON formated string
						try {
							var obj = jQuery.parseJSON(returnData.match(/.*({[.\s\S\w\W\n\r\t\0]*}).*/g));
							if (obj.val != undefined) {
								var values = convString(obj.val, obj.len, obj.typ, obj.str, ERROR);
								CALLBACK_OK(values);
							}
							else {
								CALLBACK_OK(obj);
							}
						}
						catch (e) {
							if (CALLBACK_ERROR != undefined && typeof CALLBACK_ERROR == 'function') {
								CALLBACK_ERROR();
							}
							console.error("Error occurred while parse JSON String data\nAutomatically fix went wrong!\n" + e.message + "\nData:\n" + returnData);
						}
					}
				}
			})
			.fail(function (returnData) { // .error
				if (CALLBACK_ERROR != undefined && typeof CALLBACK_ERROR == 'function') {
					CALLBACK_ERROR();
				}
				console.error("Error occurred while readWriteToPLC data\n" + ERROR + "\nData:\n" + returnData);
			});
	}

	function Controller() {
		var _self = this;
		// Array für AJAX Requests
		var _xhrPool = [];
		// ID for Load image indicator
		var _loadImageID = null;
		var _loadImage = true;
		// Logon Variable
		var _logOnOff = false;
		var _logOnOffStatus = false;
		// original login/logout form elements
		var _inputUsername;
		var _inputPassword;
		var _buttonLogin;
		var _divInvalid;
		var _spanCurrentUser;
		var _buttonLogout;

		// decode Entities
		_self.decodeEntities = function (DATA) {
			return htmlDecodeEntities(DATA);
		}

		// version Check, returns string of version
		_self.Version = function () {
			return version;
		}

		// read PLC Type
		_self.getTypeOfPLC = function () {
			if (_plcType == null) {
				console.error("NO PLC Type determined!");
				return "";
			}
			return _plcType;
		}

		//Alarms
		_self.initAlarmPage = function (contentAlarm, alarmSelector, alarmTableDiv, alarmDetailDiv, alarmDetailNo, alarmDetailEventID, alarmDetailText) {
			// if already done?
			if (!alarmInitialized) {
				// singing that the instance is generated now
				alarmInitialized = true;
				// View Instances
				var view = new alarmView();

				// reference relevant Elements
				alarmElements.pages = $(contentAlarm);
				alarmElements.pages.alarmSelector = alarmSelector;
				alarmElements.pages.alarmTableDiv = alarmTableDiv;
				alarmElements.pages.alarmTable = $(alarmTableDiv + " > table");
				alarmElements.pages.alarmTable.onclick = alarmTableDiv + " > table tbody tr[onclick]";
				alarmElements.pages.alarmTable.tr = alarmTableDiv + "> table tbody tr";
				alarmElements.pages.alarmTable.a = alarmTableDiv + "> table tbody tr td a";
				alarmElements.pages.alarmTable.btn = alarmTableDiv + "> table tbody tr td input[name='btnAck']";
				alarmElements.pages.alarmTable.data = alarmTableDiv + "> table tbody tr[data-alarm]"; //***
				alarmElements.pages.alarmTable.selected = alarmTableDiv + "> table tbody tr[id=rowSelected]";
				alarmElements.pages.alarmDetail = $(alarmDetailDiv);
				alarmElements.pages.alarmDetail.No = alarmDetailNo;
				alarmElements.pages.alarmDetail.EventID = alarmDetailEventID;
				alarmElements.pages.alarmDetail.Text = alarmDetailText;

				$(window).resize(function () {
					view.resize();
				});

				// Event handler for SELECT diagnostic page
				$(alarmElements.pages.alarmSelector).change(function () {
					loadAlarmTable($(this).val());
				});

				prevState = history.state;
				prevTitle = document.title;
				prevUrl = location.href;
			}

			// load data
			loadAlarmMain();
			return true;
		}
		//Diagnose
		_self.initDiagnosticPage = function (contentDiag, diagSelector, diagTableDiv, diagDetailDiv, diagDetailNo, diagDetailEventID, diagDetailText) {
			// if already done?
			if (!diagInitialized) {
				// singing that the instance is generated now
				diagInitialized = true;
				// View Instances
				var view = new diagView();

				// reference relevant Elements
				diagElements.pages = $(contentDiag);
				diagElements.pages.diagSelector = diagSelector;
				diagElements.pages.diagTableDiv = diagTableDiv;
				diagElements.pages.diagTable = $(diagTableDiv + "> table");
				diagElements.pages.diagTable.onclick = diagTableDiv + "> table tbody tr[onclick]";
				diagElements.pages.diagTable.data = diagTableDiv + "> table tbody tr[data-diag]";
				diagElements.pages.diagTable.selected = diagTableDiv + "> table tbody tr[id=rowSelected]";
				diagElements.pages.diagDetail = $(diagDetailDiv);
				diagElements.pages.diagDetail.No = diagDetailNo;
				diagElements.pages.diagDetail.EventID = diagDetailEventID;
				diagElements.pages.diagDetail.Text = diagDetailText;

				$(window).resize(function () {
					view.resize();
				});

				// Event handler for SELECT diagnostic page
				$(diagElements.pages.diagSelector).change(function () {
					loadDiagTable($(this).val());
				});

				prevState = history.state;
				prevTitle = document.title;
				prevUrl = location.href;
			}

			// load data
			loadDiagMain();
			return true;
		}

		// Login check
		_self.loginCheck = function (iframeID, loginDivId) {
			var _iframeID = '#WebserverIFrame';
			var _loginDivId = '#loginBox';
			if (arguments.length >= 2) {
				_iframeID = iframeID;
				_loginDivId = loginDivId;
			}

			var iFrameSelect = $("iframe" + _iframeID).contents();// get iFrame content
			var loginForm = iFrameSelect.find("#loginForm"); //S7-1200 FW4.0 + S7-1500 FW2.X
			if (loginForm.length == 0) {
				loginForm = iFrameSelect.find("#Login_Area_Form");//S7-1200 FW2.2 and S7-1500 FW1.5

				_buttonLogin = iFrameSelect.find("#Login_Area_Submit_Button");
				if (_buttonLogin.length == 0) {
					_buttonLogin = iFrameSelect.find("#Login_Area_SubmitButton");
				}
				if (_buttonLogin.length == 0) {
					_inputPassword = iFrameSelect.find("[name='Password']");
					_inputUsername = iFrameSelect.find("[name='Login']");
					_buttonLogin = iFrameSelect.find("#login_box_button");
				} else {
					_divInvalid = iFrameSelect.find("#Login_InvalidLogin");
					_inputPassword = iFrameSelect.find("#Login_Area_PW_InputTag");
					_inputUsername = iFrameSelect.find("#Login_Area_Name_InputTag");
				}
			} else { // fill variables of the controller with the login elements

				_buttonLogin = iFrameSelect.find("#Login_Area_SubmitButton");
				if (_buttonLogin.length != 0) {
					_divInvalid = iFrameSelect.find("#Login_InvalidLogin");
					_inputPassword = iFrameSelect.find("#Login_Area_PW_InputTag");
					_inputUsername = iFrameSelect.find("#Login_Area_Name_InputTag");
				} else {
					_buttonLogin = iFrameSelect.find("#loginButton");
					_divInvalid = undefined;
					_inputPassword = iFrameSelect.find("#password");
					_inputUsername = iFrameSelect.find("#username");
				}
			}
			if (loginForm.length > 0) {
				loginForm.attr("data-ajax", "false");
				$(_loginDivId).html(loginForm.parent());
				loginForm.find("input[name='Redirection']").val(location.href.split("?")[0]);
				_logOnOff = false; // logged out
			}
			// search for LogOut box in iFrame
			var logoutForm = iFrameSelect.find("#logoutForm");//S7-1200 FW4.0 + S7-1500 FW2.X
			if (logoutForm.length == 0) {
				logoutForm = iFrameSelect.find("#logout_form"); //S7-1200 FW2.2
				_spanCurrentUser = iFrameSelect.find("#logout_td_name");
				_buttonLogout = iFrameSelect.find("#logout_form_button");
			} else {
				// fill fields with original logout form elements
				_spanCurrentUser = iFrameSelect.find("#loggedInUser").find("span");
				_buttonLogout = iFrameSelect.find("#logoutButton > button");
				// 1200 / FW 4.1
				if (_buttonLogout.length == 0) {
					_buttonLogout = iFrameSelect.find("#logoutButton > input");
				}
			}
			if (logoutForm.length == 0) {
				logoutForm = iFrameSelect.find("#Logout_Area_Form"); //S7-1500 FW1.5
				_spanCurrentUser = iFrameSelect.find("#logout_user_name > nobr");
				_buttonLogout = iFrameSelect.find("#logout_area_logout_button > button");
			}
			if (logoutForm.length > 0) {
				logoutForm.attr("data-ajax", "false");
				$(_loginDivId).html(logoutForm.parent());
				logoutForm.find("input[name='Redirection']").val(location.href.split("?")[0]); // use the current webpage as redirection - remove additonal post values attached by "?" if necessary
				_logOnOff = true; // logged in
			}
			_logOnOffStatus = true;
			return _logOnOff;
		}
		// return the status, call inside the script to check if logged IN or OUT
		_self.loginStatus = function () {
			if (_logOnOffStatus == false)
				console.error("Login status not proofed - Call as previous step 'loginCheck()'");
			return _logOnOff;
		}

		// attach custom login/logout forms
		_self.attachLoginForm = function (loginDiv, userInput, pwInput, loginButton, logoutDiv, userSpan, logoutButton, invalidSpan) {
			// check for valid login status
			if (arguments.length != 8) {
				console.error("Not enough arguments delivered to attachLoginForm call. Yes, we need ALL those infos!");
				return false;
			}
			if (!_logOnOffStatus) {
				console.error("Login status not approved - Call loginCheck() first!");
				return false;
			}

			// hide login & logout Div container
			$("#" + logoutDiv).hide();
			$("#" + loginDiv).hide();

			// logged in --> show logout div
			if (_logOnOff) {
				$("#" + userSpan).text(_spanCurrentUser.text());

				$("#" + logoutButton).click(function () {
					_buttonLogout.click();
				});

				$("#" + logoutDiv).show();

			} else { // logged out --> show login div

				$("#" + userInput).change(function () {
					_inputUsername.val($("#" + userInput).val());
				});

				$("#" + pwInput).change(function () {
					_inputPassword.val($("#" + pwInput).val());
				});

				$("#" + loginButton).click(function () {
					_buttonLogin.click();
				});

				//show login div as all wiring is done
				$("#" + loginDiv).show();
			}
		}

		// read active username
		_self.readLoggedInUser = function () {
			if (!_logOnOffStatus) {
				console.error("Login status not approved - Call loginCheck() first!");
				return "";
			}
			if (_logOnOff) {
				return _spanCurrentUser.text();
			}
			else
				return "";
		}

		// display the selecte BOX and hid all others --> Single Page Application
		_self.navigation = function (CONTENT_CONTROL, NAVI_CONTENT, NOT_SELECTED, SELECTED) {
			// get actual location
			var ref = document.links;
			var loc = location.href;
			for (var i = 0; i < ref.length; i++) {
				// location and link match
				if (loc == ref[i].href) {
					ref[i].className = SELECTED;	// add class
					//ref[i].removeAttribute("href");	// remove link	// leave the loop
				} else { ref[i].className = NOT_SELECTED; }
			}
			if (CONTENT_CONTROL) {
				var splitLoc = loc.split("#");
				var showId = splitLoc[1];
				var content = $('.' + NAVI_CONTENT);
				$('.' + NAVI_CONTENT).each(function () {
					if (this.id == showId) {
						$("#" + this.id).show();
					} else {
						$("#" + this.id).hide();
					}
				});
			}
		}

		// Check links and set class menuActive
		_self.menuHighlight = function () {
			var loc = location.href;							// get actual location
			var ref = document.links;							// get all links
			for (var i = 0; i < ref.length; i++) {					// run trough the links
				if (loc == ref[i].href) {							// location and link match
					ref[i].parentNode.className = "menuActive";	// add class
					//ref[i].removeAttribute("href");			// remove link
					break;										// leave the loop
				}
			}
		}

		// Check numeric inputs in range FUNCTION CALL --> $("#dev_table").change(limitInput);
		_self.limitInput = function () { // Check Device Table number input is in limits
			if (parseInt($(this).val(), 10) > parseInt($(this).prop("max"), 10)) {
				$(this).val(parseInt($(this).prop("max"), 10));
			}
			else if (parseInt($(this).val(), 10) < parseInt($(this).prop("min"), 10)) {
				$(this).val(parseInt($(this).prop("min"), 10));
			}
		};

		_self.spriteSwitch = function (VAL, ARRAY_IMG, IMG_ID, ARRAY_TXT, TXT_ID, ARRAY_TXT_COLOR) {
			// graphic values
			$(IMG_ID).css({ "background-position": ARRAY_IMG[VAL][0] + "px " + ARRAY_IMG[VAL][1] + "px" })
				.prop({ alt: ARRAY_TXT[VAL], title: ARRAY_TXT[VAL] });
			// span text
			if (TXT_ID != null) {
				$(TXT_ID)
					.text(ARRAY_TXT[VAL])
				if (ARRAY_TXT_COLOR != null) {
					$(TXT_ID)
						.css('color', ARRAY_TXT_COLOR[VAL]);
				}
			}
		}

		_self.writeData = function (URL, DATA, ERROR, CALLBACK_OK, CALLBACK_ERROR) {
			// check if logged on or NOT --> if NOT --> can't write DATA
			//	if(log == false && window.location.hostname){
			//		alert("You need to log on in order to write Data!!!\nPlease log in!"); // Alert if not logged in --> can't change values !!!
			//		return false;
			//	}
			readWriteToPLC(URL, DATA, ERROR, CALLBACK_OK, CALLBACK_ERROR);
		}

		_self.writeForm = function (URL, ID, ERROR, CALLBACK_OK, CALLBACK_ERROR) {
			// check if logged on or NOT --> if NOT --> can't write DATA
			//	if(log == false && window.location.hostname){
			//		alert("You need to log on in order to write Data!!!\nPlease log in!"); // Alert if not logged in --> can't change values !!!
			//		return false;
			//	}
			readWriteToPLC(URL, $(ID).serialize(), ERROR, CALLBACK_OK, CALLBACK_ERROR);
		}

		_self.readData = function (URL, ERROR, CALLBACK_OK, CALLBACK_ERROR) { // load data
			readWriteToPLC(URL, 'noData', ERROR, CALLBACK_OK, CALLBACK_ERROR);
		}

		// read dataLogs from file browser and return content as String
		_self.readDataLog = function (NAME, ERROR, CALLBACK_OK, CALLBACK_ERROR) { // load Data Log --> CSV File
			var prevState = history.state;
			var prevTitle = document.title;
			var prevUrl = location.href;
			var url = "";
			// set referrer to main entry page of web-server --> Portal.mwsl
			if (location.origin != "null" && location.origin != "file://") {
				if (_plcType == "1500") {
					history.pushState({ MyObj: "PriNav" }, "PriNav", location.origin + "/Portal/Portal.mwsl?PriNav=Filebrowser&Path=/DataLogs/");
					url = location.origin + "/Filebrowser?Path=/DataLogs/" + NAME + ".csv&RAW";
				}
				else if (_plcType == "1200") {
					history.pushState({ MyObj: "PriNav" }, "PriNav", location.origin + "/Portal/Portal.mwsl?PriNav=FileBrowser&Path=/DataLogs/");
					url = location.origin + "/FileBrowser/Download?Path=/DataLogs/" + NAME + ".csv";
				}
				else {
					console.info('Wrong CPU TYPE Parameter given to S7Framework.initialize("plcType",....);\n "1200" or "1500" are possible types');
					return false;
				}
			}
			else {
				url = NAME + ".csv";
			}
			console.assert(!DEBUG, "DataLog URL:", url);
			$.ajax({ type: "GET", url: url, data: 'noData', dataType: "text", cache: false })
				.done(function (CSVdata) { // .success
					if (CALLBACK_OK != undefined && typeof CALLBACK_OK == 'function') {
						CALLBACK_OK(CSVdata);
					}
				})
				.fail(function (CSVdata) { // .error
					if (CALLBACK_ERROR != undefined && typeof CALLBACK_ERROR == 'function') {
						CALLBACK_ERROR(CSVdata);
					}
					console.error("Error occurred while Read DataLog: " + NAME + "\n" + ERROR + "\nData:\n" + CSVdata);
				});
			//history.pushState(prevState, prevTitle, prevUrl);
			history.replaceState(prevState, prevTitle, prevUrl);
		}

		// show FileBrowser
		_self.showFileBrowser = function (IFrameID) {
			// attach event ONLOAD to iFrame
			if (_plcType == "1500") {
				$(IFrameID).on("load", function () {
					$(this).css('height', '');
					$(this).contents().find("head").append("<style type='text/css'>.Header_Area, #headerArea, #Header_Language_Time_Date, #dateTimeBar, #MainMenu_Area, #separatorLine1, #separatorLine2, #separatorLine3, #loginBox, .clearer, .Separation_Line, #navigationArea, #titleArea, #TR_319 {display:none;} div#clientArea, div#contentArea{margin:0; top:0; left:0;} </style>");
					//$(this).css("height", $(this).contents().find("table.Data_Area").height() + "px");
					if ($(this).contents().find("#clientArea").height() != null) {
						//console.log( "FW >= 2.0" );
						$(this).css({
							"height": (($(this).contents().find("#clientArea").height() + 60) + "px"),
							"width": (($(this).contents().find("#clientArea").width() + 10) + "px"),
							"border": "0"
						});
					}
					else {
						//console.log( "FW <= 1.8.4" );
						$(this).css({
							"height": (($(this).contents().find("#TR_1278").height() + 30) + "px"),
							"width": (($(this).contents().find("#TR_1278").width() + 10) + "px"),
							"border": "0"
						});
					}
				});
				// attach source to iFrame - iFrame loads afterwards automatically the content
				$(IFrameID).attr('src', '../../Portal/Portal.mwsl?PriNav=Filebrowser');
			}
			else if (_plcType == "1200") {
				$(IFrameID).on("load", function () {
					$(this).css('height', '');
					$(this).contents().find("head").append("<style type='text/css'>body{ background: transparent;}.Header_Area, #headerArea, #Header_Language_Time_Date, #dateTimeBar, #MainMenu_Area, #separatorLine1, #separatorLine2, #separatorLine3, #loginBox, .clearer, .Separation_Line, #navigationArea, .Title_Area, div#titleArea, #titleArea, #TR_319 {display:none;} div#clientArea, div#contentArea{margin:0; top:0; left:0;} </style>");
					//$(this).css("height", $(this).contents().find("table.Data_Area").height() + "px");
					if ($(this).contents().find(".table_position").height() != null) {
						//console.log( "FW >= 4.2" );
						$(this).css({
							"height": (($(this).contents().find(".table_position").height() + 60) + "px"),
							"width": (($(this).contents().find(".table_position").width() + 30) + "px"),
							"border": "0"
						});
					}
					else {
						//console.log( "FW <= 4.1" );
						$(this).css({
							"height": (($(this).contents().find("#fileBrowserWrapper").height() + 30) + "px"),
							"width": (($(this).contents().find("#fileBrowserTable").width() + 30) + "px"),
							"border": "0"
						});
					}

				});
				// attach source to iFrame - iFrame loads afterwards automatically the content
				$(IFrameID).attr('src', '../../Portal/Portal.mwsl?PriNav=FileBrowser');
			}
			else {
				console.info('Wrong CPU TYPE Parameter given to S7Framework.initialize("plcType");\n "1200" or "1500" are possible types');
			}
		}

		// Sart/Stop Method (tested on S7-1512SP and 1215C DC/DC/DC)
		_self.startStopPLC = function (START_STOP) {
			// save actual referer
			var prevState = history.state;
			var prevTitle = document.title;
			var prevUrl = location.href;
			// variables for diffrent URL and DATA
			var urlStart = "", urlStop = "", dataStart = "", dataStop = "";
			// set tags along to chossen PLC Type
			if (_plcType == "1500") {
				urlStop = "/ClientArea/CPUAction.mwsl?Action=Stop";
				urlStart = "/ClientArea/CPUAction.mwsl?Action=Start";
				dataStop = "";
				dataStart = "";
			}
			else if (_plcType == "1200") {
				urlStop = "/CPUCommands";
				urlStart = "/CPUCommands";
				dataStop = "PriNav=Start&Stop=STOP";
				dataStart = "PriNav=Start&Run=RUN";
			}
			else {
				console.info('Wrong CPU TYPE Parameter given to S7Framework.initialize("plcType");\n "1200" or "1500" are possible types');
				return false;
			}
			// check for procedure
			if ("START" == START_STOP.toUpperCase()) {
				urlStop = urlStart;
				dataStop = dataStart;
			}
			// set referrer to main entry page of web server --> Portal.mwsl
			history.pushState({ MyObj: "PriNav" }, "PriNav", location.origin + "/Portal/Portal.mwsl?PriNav=Start");
			// request CPU Stop
			$.post(urlStop, dataStop)
				.done(function () { // .successful stopped
					if ("RESTART" == START_STOP.toUpperCase()) {
						history.pushState({ MyObj: "PriNav" }, "PriNav", location.origin + "/Portal/Portal.mwsl?PriNav=Start");
						// request CPU StartUp
						$.post(urlStart, dataStart)
							.done(function () { // .successful started
								//_timeOutRestart = setTimeout( function() { model.confirmRestart() }, 1000*5 );
							})
							.fail(function () { // .error
								console.error("Error occurred while trying to START " + _plcType + " CPU");
							});
						history.replaceState(prevState, prevTitle, prevUrl);
					}
				})
				.fail(function () { // .error
					console.error("Error occurred while trying to " + START_STOP.toUpperCase() + " " + _plcType + " CPU");
				});
			// set referrer back to the one before startup
			history.replaceState(prevState, prevTitle, prevUrl);
		}
		// restart Method (tested on S7-1512SP and 1215C DC/DC/DC)
		_self.restartPLC = function () {
			// call internal Method
			return _self.startStopPLC("restart");
		}
		// stop Method (tested on S7-1512SP and 1215C DC/DC/DC)
		_self.stopPLC = function () {
			// call internal Method
			return _self.startStopPLC("stop");
		}
		// start Method (tested on S7-1512SP and 1215C DC/DC/DC)
		_self.startPLC = function () {
			// call internal Method
			return _self.startStopPLC("start");
		}

		// toggle LEDs Methods (tested with 1518)
		_self.toggleLEDs = function () {
			// save actual referer
			let prevState = history.state;
			let prevTitle = document.title;
			let prevUrl = location.href;
			let urlToggle;
			let postData;
			if (_plcType === "1500") {
				urlToggle = "/ClientArea/CPUAction.mwsl?Action=FlashLeds"
				postData = "";
			} else if (_plcType === "1200") {
				urlToggle = "/CPUCommands";
				postData = "PriNav=Start&FlashLed=Flash+LEDs";
			}
			history.pushState({ MyObj: "PriNav" }, "PriNav", location.origin + "/Portal/Portal.mwsl?PriNav=Start");
			$.post(urlToggle, postData)
				.done(function () { // .successful stopped
				})
				.fail(function () { // .error
					console.error("Error occurred while trying to " + "toggle the LEDs:" + " " + _plcType + " CPU");
				});
			// set referrer back to the one before startup
			history.replaceState(prevState, prevTitle, prevUrl);
		}

		// show and hide loadIndicator
		_self.showHideIndicator = function (indicator) {
			if (arguments.length) {
				_self._loadImage = indicator;
			}
			return _self._loadImage;
		}

		// Abort all active AJAX tasks
		_self.abortAllAjax = function () {
			for (var i = 0; i < _xhrPool.length; i++) {
				_xhrPool[i].abort();
			}
			_xhrPool = [];
		}

		// initialize Framework and select PLC by searching in the intro page
		_self.initAuto = function (loadImageID, CALLBACK_OK, CALLBACK_ERROR) {
			//Load the code of the intro page of the standard web pages
			$.ajax({ type: "GET", url: location.origin + "/Portal/Intro.mwsl", data: "", dataType: "text" })
				.done(function (webpageData) { // .success
					//search for "CPU12" in the code of the intro page if true -> plcType = 1200
					var search12 = webpageData.search("CPU12");
					//search for "CPU15" in the code of the intro page if true -> plcType = 1500
					var search15 = webpageData.search("CPU15");
					if (search12 >= 0) {
						_self.initialize("1200", loadImageID);
					}
					else if (search15 >= 0) {
						_self.initialize("1500", loadImageID);
					}
					else {
						_self.initialize("", loadImageID);
						alert("The PLC Type couldn't be identified!");
						console.error("The PLC Type couldn't be identified!", "\n", "Automatic initialization aborted!!!");
						initializedRetVal = false;
						return initializedRetVal;
					}
					if (CALLBACK_OK != undefined && typeof CALLBACK_OK == 'function') {
						CALLBACK_OK();
					}
					return initializedRetVal;
				})
				.fail(function (webpageData) { // .error
					if (CALLBACK_ERROR != undefined && typeof CALLBACK_ERROR == 'function') {
						CALLBACK_ERROR();
					}
					_self.initialize("", loadImageID);
					alert("The PLC Type couldn't be identified!\nTransmission failed!");
					console.error("The PLC Type couldn't be identified!\nTransmission failed!\nAutomatic initialization aborted!!!");
					initializedRetVal = false;
					return initializedRetVal;
				});
		}

		// initialize Framework
		_self.initialize = function (plcType, loadImageID) {
			if (initialized) {
				return initializedRetVal;
			}
			// set sign to remember framework is already initialized
			initialized = true;

			// workaround for IE, because location.origin is not supported in IE
			if (typeof window.location.origin === undefined || !window.location.origin) {
				window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
			}

			// define string.trim() if not defined
			if (typeof String.prototype.trim === undefined || !String.trim) {
				// String.prototype.trim = function () { return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ''); };
				String.prototype.trim = function () {
					return this.replace(/^(\s|\u00A0)+|(\s|\u00A0)+$/g, '');
				};
			}
			// workaround for IE, because string.includes is not supported in IE
			if (typeof String.prototype.includes === undefined || !String.includes) {
				String.prototype.includes = function () {
					return String.prototype.indexOf.apply(this, arguments) !== -1;
				};
			}
			// define string.contains() if not defined
			if (typeof String.prototype.contains === undefined || !String.contains) {
				String.prototype.contains = function (it) {
					return this.indexOf(it) != -1;
				};
			}

			// NOOPs for console
			if (window.console == undefined)
				window.console = {};
			if (window.console.log == undefined)
				window.console.log = function () { };
			if (window.console.debug == undefined)
				window.console.debug = function () { };
			if (window.console.info == undefined)
				window.console.info = function () { };
			if (window.console.warn == undefined)
				window.console.warn = function () { };
			if (window.console.error == undefined)
				window.console.error = function () { };
			if (window.console.assert == undefined)
				window.console.assert = function () { };

			// save CPU type from arguments to local object storage
			if (arguments.length >= 2) {
				console.info("PLC Type := " + plcType);
				_plcType = plcType;
				_self._loadImageID = loadImageID;
			}
			else {
				console.error("Missing Parameter @ S7Framework.initialize(plcType, loadImageID)", "\n", "Initialization aborted!!!");
				initializedRetVal = false;
			}

			// AJAX Setup
			$.ajaxSetup(
				{
					mimeType: "text/plain", // to suppress JSON Failure
					async: true, // set transfer mode to asynchronous
					cache: false // avoid caching of JSON Files
					//isLocal: true
				},
				{ // Write alle AJAX Requests in array, and delete if finished
					beforeSend: function (jqXHR) {
						_self._xhrPool.push(jqXHR);
					},
					complete: function (jqXHR) {
						var index = _self._xhrPool.indexOf(jqXHR);
						if (index > -1) {
							_self._xhrPool.splice(index, 1);
						}
					}
				}
			);

			// Load indicator Event on START or STOP AJAX Call
			$(_self._loadImageID).hide();
			// Show the load picture
			$(document).ajaxStart(function () {
				if (_self._loadImage) $(_self._loadImageID).show();
			});
			// hide the load picture
			$(document).ajaxStop(function () {
				$(_self._loadImageID).hide();
				_self._loadImage = true;
			});
			initializedRetVal = true;
			return initializedRetVal;
		}
	} // Controller

	// generate Controller
	var controller = new Controller();
	return controller;
})(jQuery);

// function taken from standard page...
// needed to use login/ logout fields insidfe of user defined webpages
function setLoginCookie() {
	window.top.document.cookie = "coming_from_login=true";
}