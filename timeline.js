/**
 * Copyright (C) 2008, 2009 FBK Foundation, (http://www.fbk.eu)
 * Author: Federico Scrinzi @ SoNet Group
 *
 * OpenLayers-Timeline is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation version 3 of the License.
 */

/**
 * Class: OpenLayers.Timeline
 * This class represents a timeline based on jQuery-UI Slider
 */
OpenLayers.Timeline = OpenLayers.Class({
    map: undefined,
    slider: undefined,
    current_date: new Date().getTime() / 1000,
    display_layer: undefined,
    current_data: undefined,
    timerId: undefined,
    selectControl: undefined,
    selectedFeature: undefined,
    interval: 5,
    speeds: ["Really slow", "Slow", "Normal", "Fast", "Really fast"],
    curr_speed: undefined,
    data_format: undefined,
    cumulative: true,
    timedelta: 15552000,  // 6 months
    first: undefined,

    initialize: function(options) {
        this.map = options.map;
        this.slider = options.timeline;
        this.curr_speed = parseInt(this.speeds.length / 2);
        this.data_format = new options.format();
        if (options.date_key) {
            this.data_format.date_key = options.date_key;
        }
        this.data_format.timestamp_funct = options.date_funct;
        var self = this;
        $(this.slider).slider({
            range: "min",
            min: 0,
            max: 100,
            value: 0,
            disabled: true,
            change: function (e, ui) {
                if (self.display_layer) {
                    if (ui) {
                        self.data_format.past_seconds =
                          Math.ceil(self.first+(self.current_date-self.first)*(ui.value / 100.0));
                    }
                    if (!self.cumulative) {
                        self.data_format.lowerlimit = self.data_format.past_seconds - self.timedelta;
                    }
                    else {
                        self.data_format.lowerlimit = undefined;
                    }
                    self.map.removeLayer(self.display_layer);
                    self.selectControl.deactivate();
                    self.map.removeControl(self.selectControl);
                }
                self.display_layer = self.createDisplayLayer();
                if (self.display_layer.getDataExtent() &&
                    self.cumulative) {
                    self.map.zoomToExtent(self.display_layer.getDataExtent(), false);
                }
            },
            slide: function(e, ui) {
                self.stopBar();
                if (self.current_data) {
                    self.data_format.past_seconds =
                      Math.ceil(self.first+(self.current_date-self.first)*(ui.value / 100.0));
                }

                var d = new Date(self.data_format.past_seconds*1000);
                d = d.getDate()+"/"+(d.getMonth()+1)+"/"+d.getFullYear();
                var tooltip = $("<div/>")
                          .css({ position: 'absolute', top: "20px", left: "0px"})
                          .addClass("slider-tooltip")
                          .text(d);
                $(self.slider).slider()
                    .find(".ui-slider-handle")
                    .append(tooltip);
                setTimeout(function() { tooltip.remove(); }, 500);
            }
        });
    },

    defaultStyle: new OpenLayers.Style({
                                graphicName: "circle",
                                strokeColor: "#ff0000",
                                fillColor: "#ff0000",
                                pointRadius: "${radius}",
                                fillOpacity: 0.5,
                                strokeWidth: "${width}"
                            },
                            { context : {
                                    radius: function(feature) {
                                        if (feature.attributes.count == 1) return 3;
                                        return Math.min(Math.ceil(feature.attributes.count / 12), 25) + 5;
                                    },
                                width: function(feature) {
                                        return (feature.attributes.count > 1) ? 2 : 0.5;
                                    }
                                }
                            }),

    createDisplayLayer: function() {
        if (!this.map) {
            return false;
        }
        var l = new OpenLayers.Layer.Vector("display", {
                    strategies: [new OpenLayers.Strategy.Cluster()],
                    styleMap: this.defaultStyle
                });

        if (this.current_data) {
            this.map.addLayer(l);
            l.addFeatures(this.data_format.read(this.current_data));
            this.first = this.data_format.first;
        }

        this.selectControl = new OpenLayers.Control.SelectFeature(
                                 [l],{clickout: true, toggle: false,
                                      multiple: false, hover: false }
                             );
        this.map.addControl(this.selectControl);
        this.selectControl.activate();
        var self = this;
        l.events.on({
            "featureselected": function(e) {
                self.onFeatureSelect(e.feature);
            },
            "featureunselected": function(e) {
                self.onFeatureUnselect(e.feature);
            }
        });
        return l;
    },

    update: function() {
        $(this.slider).slider("value", $(this.slider).slider("value"));
    },

    onPopupClose: function(evt) {
       this.selectControl.unselect(this.selectedFeature);
    },

    onFeatureSelect: function(feature) {
        if (feature.attributes.count > 1) {
            this.selectedFeature = feature;
            var desc = "";
            if (feature.cluster.length > 1) {
                desc += "<strong>" + feature.cluster.length + " features in this area</strong><br/>";
            }
            if (feature.cluster.length > 1) {
                desc += "<br/><em>tip: increase the zoom level</em>";
            }
            desc += "</div>";
            var popup = new OpenLayers.Popup.FramedCloud("chicken",
                        feature.geometry.getBounds().getCenterLonLat(),
                        new OpenLayers.Size(1000,500),
                        desc,
                        null,
                        true,
                        this.onPopupClose);
            popup.selectControl = this.selectControl;
            popup.selectedFeature = this.selectedFeature;
            feature.popup = popup;
            this.map.addPopup(popup);
        }
    },

    onFeatureUnselect: function (feature) {
        this.map.removePopup(feature.popup);
        feature.popup.destroy();
        feature.popup = null;
    },

    initTimeline: function(data) {
        this.current_data = data;
        this.display_layer = this.createDisplayLayer();
        var past_seconds = this.data_format.past_seconds;
        $(this.slider).slider({ disabled: false });
        if (past_seconds - this.firstpoint > 0) {
            $(this.slider).slider("value", Math.ceil(((past_seconds-this.firstpoint)
                                   / (this.current_date-firstpoint)) * 100));
        }
    },

    animateBar: function() {
        if (!this.timerId && this.current_data) {
            if (100 - $(this.slider).slider("value") <= 3) {
                $(this.slider).slider("value", 0);
            }
            var self = this;
            this.timerId = setInterval(function() {
                var past_seconds = self.data_format.past_seconds;
                if (past_seconds < self.current_date) {
                    var curr_val = $(self.slider).slider("value");
                    $(self.slider).slider("value", (curr_val+self.interval));
                }
                else {
                    clearInterval(self.timerId);
                    self.timerId = undefined;
                }
            }, 1000);
        }
    },

    getCurrentTime: function() {
        return this.data_format.past_seconds;
    },

    getBarValue: function() {
        return $(this.slider).slider("value");
    },

    setBarValue: function(value) {
        $(this.slider).slider("value", value);
    },

    getCurrentSpeed: function(value) {
        return this.speeds[this.curr_speed];
    },

    stopBar: function() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = undefined;
        }
    },

    togglePlay: function() {
        if (this.timerId) {
            this.stopBar();
        }
        else {
            this.animateBar();
        }
    },

    fasterAnimation: function() {
        if (this.interval < 15) {
            this.interval += 2;
            if (this.curr_speed < this.speeds.length-1) {
                this.curr_speed++;
            }
            if (this.timerId) {
                this.stopBar();
                this.animateBar();
            }
        }
    },

    slowerAnimation: function() {
        if (this.interval >= 3) {
            this.interval -= 2;
            this.curr_speed--;
        }
        if (this.timerId) {
            this.stopBar();
            this.animateBar();
        }
    },

    CLASS_NAME: "OpenLayers.Timeline"
});
