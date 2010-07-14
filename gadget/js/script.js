

function load() {
	var prefs = new gadgets.Prefs();
	
	if (prefs.getString("is_configured") != 0) {
		loadAndDraw();
		return ;
	} else {
		editPreferences();
	}
	
	
}

function editPreferences() {
	$("#preferences").show();
	$("#holder").hide();
	$("#date_params").hide();
	
	//Update the list of project if the url has changed
    $("#id_roo_service_url").focus(function() {
        old_url = $("#id_roo_service_url").val();
    });
    $("#id_roo_service_url").blur(function() {
        if (old_url !== $("#id_roo_service_url").val()) {
            updateEntityList($("#id_roo_service_url").val());
        }
    });

	$("#id_class_name").blur(function() {
		updateFieldName();
	});
	
	$("#id_field_name").blur(function() {
		showHideDatePref();
	});

    $("form").submit(function() {
        savePreferences();
		$("#preferences").hide();
		$("#holder").show();
        return false;
    });

	var prefs = new gadgets.Prefs();
    $("#id_roo_service_url").val(prefs.getString("roo_service_url"));
	$("#id_name").val(prefs.getString("name"));
	$("#id_from").val(prefs.getString("from"));
	$("#id_graph_type").val(prefs.getString("graph_type"));
	$("#id_to").val(prefs.getString("to"));
    updateEntityList();

	//init the datetime picker
	Date.firstDayOfWeek = 0;
	Date.format = 'mm/dd/yyyy';
	$('#date_params input').datePicker({clickInput:true, startDate: '01/01/1970'}).dpSetPosition($.dpConst.POS_BOTTOM, $.dpConst.POS_LEFT);
	
    gadgets.window.adjustHeight($(document).height());
}

function showHideDatePref() {
	var className = $("#id_class_name").val(), i,
		propertyName = $("#id_field_name").val(),
		properties = window._cacheObjectsInfos.properties[className];
	
	if (properties !== undefined) {	
		for (i = 0; i < properties.length; i += 1) {
			if (properties[i].name === propertyName && properties[i].isDate) {
				$("#date_params").show();
				gadgets.window.adjustHeight($(document).height());
				return;
			}
		}
	}
	$("#id_from").val("");
	$("#id_to").val("");
	$("#date_params").hide();
}

function savePreferences() {
    var prefs = new gadgets.Prefs();

    prefs.set("roo_service_url", $("#id_roo_service_url").val(), 
			  "class_name", $("#id_class_name").val(), 
			  "field_name", $("#id_field_name").val(), 
			  "graph_type", $("#id_graph_type").val(), 
			  "name", $("#id_name").val(),
			  "from",  $("#id_from").val(),
			  "to",  $("#id_to").val(),
			  "is_configured", "1");
};

function updateFieldName() {
	var className = $("#id_class_name").val(),
		propertyName = $("#id_field_name").val() || (new gadgets.Prefs()).getString("field_name"),
		properties = window._cacheObjectsInfos.properties[className],
		options = [];
	
	if (properties !== undefined) {
		for (i = 0; i < properties.length; i += 1) {
	        options.push('<option value="', properties[i].name,  '"');
	        if (properties[i].name === propertyName) {
	            options.push(' selected="selected"');
	        }
	        options.push('>', properties[i].name, "</option>");
	    }
	}
	
    $("#id_field_name").empty().append(options.join(""));
	showHideDatePref();
}

function updateEntityList(url) {
	var url,
		params = {},
		prefs = new gadgets.Prefs();
	
    if (url === undefined || url === null) {
        url = prefs.getString("roo_service_url");
    }
	
	
	if (url === null || url.length === 0) {
        $("#id_class_name").empty();
		$("#id_field_name").empty();
		$("#date_params").hide();
    }
    else {
	
		url = url + "objectInfos";

		params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.JSON;
		gadgets.io.makeRequest(url, function(res) {
			if (res.rc !== 200) {
                $("#id_roo_service_url").css("border-color", "red");
                $("#id_class_name").empty();
				$("#id_field_name").empty();
				$("#date_params").hide();
                return;
            }
			
			window._cacheObjectsInfos = res.data;

			$("#id_roo_service_url").css("border-color", "");
            var options = [], name,
                className = prefs.getString("class_name"), i, objectsInfos = window._cacheObjectsInfos;
			
			options.push('<option value="">All Classes</option>');
            for (i = 0; i < objectsInfos.objects.length; i += 1) {
				name = objectsInfos.objects[i],
                options.push('<option value="', name, '"');
                if (name === className) {
                    options.push(' selected="selected"');
                }
                options.push('>', name.substring(name.lastIndexOf(".") + 1), "</option>");
            }
            $("#id_class_name").empty().append(options.join(""));
			updateFieldName();


		}, params);
	
    }
	
	

}

function loadAndDraw() {
	var prefs = new gadgets.Prefs(), params = {},
		isDate = prefs.getString("from") !== "" && prefs.getString("to") !== "",
		className = prefs.getString("class_name"),
		url = prefs.getString("roo_service_url");
		
	if (isDate) {
		url = url + "countObjectsByDate?from=" + prefs.getString("from") + "&to=" + prefs.getString("to") + "&className=" + className  + "&fieldName=" + prefs.getString("field_name");
	} else if (className !== "") {
		url = url + "countObjectsByValue?className=" + className  + "&fieldName=" + prefs.getString("field_name");
	}
	else {
		url = url + "countObjects";
	}
	
	if (prefs.getString("graph_type") === "pie") {
		callback = drawPie;
	} else {
		callback = drawBarChart;
	}
	
	params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.JSON;
	
	
	gadgets.io.makeRequest(url, function(res) {
		var keys = [], values = [], i;
		
		if (res.rc !== 200) {
			editPreferences();
			return ;
		}
		
		//we change the format of the data
		$.each(res.data, function(key, value){
			var pos = 0;
			//We need to sort everything
			for (; pos < keys.length; pos+= 1) {
				if (key < keys[pos]) {
					break ;
				}
			}
			keys.splice(pos, 0, key);
			values.splice(pos, 0, value);
		});
		
		if (isDate && callback !== drawPie) {
			//to keep the graph easy to read, we remove some label
			for (i = 0; i < keys.length; i += 1) {
				if (i % 7 !== 0) {
					keys[i] = " ";
				}
			}
		} else {
			for (i = 0; i < keys.length; i += 1) {
				keys[i] = keys[i].substring(keys[i].lastIndexOf(".") + 1);
			}
		}
		
		callback(keys, values);
	}, params);
}

function drawBarChart(keys, values) {
	var prefs = new gadgets.Prefs(),
		r = Raphael("holder"),
	fin = function () {
	    this.flag = r.g.popup(this.bar.x, this.bar.y, this.bar.value || "0").insertBefore(this);
	},
	fout = function () {
	    this.flag.animate({opacity: 0}, 300, function () {this.remove();});
	};
	r.g.txtattr.font = "12px 'Fontin Sans', Fontin-Sans, sans-serif";
	
	r.g.text(150, 10, prefs.getString("name")).attr({"font-size": 20});
	r.g.text(280, 10, "edit").attr({"href": "javascript:editPreferences();"});
	
	
	r.g.barchart(0, 20, 300, 220, [values]).label([keys], true, true).hover(fin, fout);
	gadgets.window.adjustHeight($(document).height());
}

function drawPie(keys, values) {
	var prefs = new gadgets.Prefs(),
		r = Raphael("holder"), i;
    r.g.txtattr.font = "12px 'Fontin Sans', Fontin-Sans, sans-serif";

	for (i = 0; i < keys.length; i++) {
		keys[i] = "## " + keys[i];
	}
	
	r.g.text(150, 10, prefs.getString("name")).attr({"font-size": 20});
	r.g.text(280, 10, "edit").attr({"href": "javascript:editPreferences();"});
	
    var pie = r.g.piechart(150, 130, 100, values, {legend: keys, legendpos: "south"});
    pie.hover(function () {
        this.sector.stop();
        this.sector.scale(1.1, 1.1, this.cx, this.cy);
        if (this.label) {
            this.label[0].stop();
            this.label[0].scale(1.5);
            this.label[1].attr({"font-weight": 800});
        }
    }, function () {
        this.sector.animate({scale: [1, 1, this.cx, this.cy]}, 500, "bounce");
        if (this.label) {
            this.label[0].animate({scale: 1}, 500, "bounce");
            this.label[1].attr({"font-weight": 400});
        }
    });
	gadgets.window.adjustHeight($(document).height());
}