/**
 * Copyright (C) 2008, 2009 FBK Foundation, (http://www.fbk.eu)
 * Author: Federico Scrinzi @ SoNet Group
 *
 * OpenLayers-Timeline is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation version 3 of the License.
 */

/**
 * Class: OpenLayers.Format.GeoRSSTimeline
 * This class represents a GeoRSS format with time support
 */
OpenLayers.Format.GeoRSSTimeline = OpenLayers.Class(OpenLayers.Format.GeoRSS, {
    past_seconds: 0,
    date_key: "when",
    first: undefined,
    lowerlimit: undefined,
    timestamp_funct: undefined,

    createFeatureFromItem: function(item) {
        var geometry = this.createGeometryFromItem(item);
        var date = this.getChildValue(item, "*", this.date_key);
        if (date) {
            if (this.timestamp_funct) {
                date = this.timestamp_funct(date);
            }
            console.log(date);
            if (!this.first || this.first > date) {
                this.first = date;
            }
            if (date > this.past_seconds) {
                return;
            }
            if (this.lowerlimit && date < this.lowerlimit) {
                return;
            }
        }

        /* Provide defaults for title and description */
        var title = this.getChildValue(item, "*", "title", this.featureTitle);

        /* First try RSS descriptions, then Atom summaries */
        var description = this.getChildValue(
            item, "*", "description",
            this.getChildValue(item, "*", "content",
                this.getChildValue(item, "*", "summary", this.featureDescription)));

        /* If no link URL is found in the first child node, try the
           href attribute */
        var link = this.getChildValue(item, "*", "link");
        if(!link) {
            try {
                link = this.getElementsByTagNameNS(item, "*", "link")[0].getAttribute("href");
            } catch(e) {
                link = null;
            }
        }

        var id = this.getChildValue(item, "*", "id", null);

        var data = {
            "title": title,
            "description": description,
            "link": link
        };
        var feature = new OpenLayers.Feature.Vector(geometry, data);
        feature.fid = id;
        return feature;

    },

    read: function(doc) {
        if (typeof doc == "string") {
            doc = OpenLayers.Format.XML.prototype.read.apply(this, [doc]);
        }

        /* Try RSS items first, then Atom entries */
        var itemlist = null;
        itemlist = this.getElementsByTagNameNS(doc, '*', 'item');
        if (itemlist.length == 0) {
            itemlist = this.getElementsByTagNameNS(doc, '*', 'entry');
        }

        var numItems = itemlist.length;
        var features = [];
        for(var i=0; i<numItems; i++) {
            var r = this.createFeatureFromItem(itemlist[i]);
            if (r) {
                features.push(r);
            }
        }
        return features;
    },
    CLASS_NAME: "OpenLayers.Format.GeoRSSTimeline"
});
