/**
 * Copyright (C) 2008, 2009 FBK Foundation, (http://www.fbk.eu)
 * Author: Federico Scrinzi @ SoNet Group
 *
 * OpenLayers-Timeline is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation version 3 of the License.
 */

 /**
 * Class: OpenLayers.Format.GeoJSONTimeline
 * This class represents a GeoJSON format with time support
 */
OpenLayers.Format.GeoJSONTimeline = OpenLayers.Class(OpenLayers.Format.GeoJSON, {
    past_seconds: 0,
    date_key: "when",
    first: undefined,
    lowerlimit: undefined,
    timestamp_funct: undefined,

    read: function(json, type, filter) {
        type = (type) ? type : "FeatureCollection";
        var results = null;
        var obj = null;
        if (typeof json == "string") {
            obj = OpenLayers.Format.JSON.prototype.read.apply(this,
                                                              [json, filter]);
        } else {
            obj = json;
        }
        if(!obj) {
            OpenLayers.Console.error("Bad JSON: " + json);
        } else if(typeof(obj.type) != "string") {
            OpenLayers.Console.error("Bad GeoJSON - no type: " + json);
        } else if(this.isValidType(obj, type)) {
            switch(type) {
                case "Geometry":
                    try {
                        results = this.parseGeometry(obj);
                    } catch(err) {
                        OpenLayers.Console.error(err);
                    }
                    break;
                case "Feature":
                    try {
                        results = this.parseFeature(obj);
                        results.type = "Feature";
                    } catch(err) {
                        OpenLayers.Console.error(err);
                    }
                    break;
                case "FeatureCollection":
                    // for type FeatureCollection, we allow input to be any type
                    results = [];
                    switch(obj.type) {
                        case "Feature":
                            try {
                                var r = this.parseFeature(obj);
                                if (r) {
                                    results.push(r);
                                }
                            } catch(err) {
                                results = null;
                                OpenLayers.Console.error(err);
                            }
                            break;
                        case "FeatureCollection":
                            for(var i=0, len=obj.features.length; i<len; ++i) {
                                try {
                                    var r = this.parseFeature(obj.features[i]);
                                    if (r) {
                                        results.push(r);
                                    }
                                } catch(err) {
                                    results = null;
                                    OpenLayers.Console.error(err);
                                }
                            }
                            break;
                        default:
                            try {
                                var geom = this.parseGeometry(obj);
                                results.push(new OpenLayers.Feature.Vector(geom));
                            } catch(err) {
                                results = null;
                                OpenLayers.Console.error(err);
                            }
                    }
                break;
            }
        }
        return results;
    },

    parseFeature: function(obj) {
        var feature, geometry, attributes, bbox, when;
        attributes = (obj.properties) ? obj.properties : {};
        when = attributes[this.date_key];
        if (this.timestamp_funct) {
            when = this.timestamp_funct(when);
        }
        if (when) {
            if (!this.first || this.first > when) {
                this.first = when;
            }
            if (when > this.past_seconds) {
                return;
            }
            if (this.lowerlimit && when < this.lowerlimit) {
                return;
            }
        }
        bbox = (obj.geometry && obj.geometry.bbox) || obj.bbox;
        try {
            geometry = this.parseGeometry(obj.geometry);
        } catch(err) {
            // deal with bad geometries
            throw err;
        }
        feature = new OpenLayers.Feature.Vector(geometry, attributes);
        if(bbox) {
            feature.bounds = OpenLayers.Bounds.fromArray(bbox);
        }
        if(obj.id) {
            feature.fid = obj.id;
        }
        return feature;
    },
    CLASS_NAME: "OpenLayers.Format.GeoJSONTimeline"
});
