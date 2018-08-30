// Bounds for display
var minBoundS = 40;
var minBoundW = -7;
var maxBoundN = 53;
var maxBoundE = 11;

// Get bounds from get parameters and validate them before using it.
var boundS = Math.max(getQueryParam("boundS") || 0, minBoundS);
var boundW = Math.max(getQueryParam("boundW") || -180, minBoundW);
var boundN = Math.min(getQueryParam("boundN") || 90, maxBoundN);
var boundE = Math.min(getQueryParam("boundE") || 180, maxBoundE);
if (boundN < boundS || boundE < boundW) {
	console.error("error - wrong coordinates parameters");
	boundN = maxBoundN;
	boundS = minBoundS;
	boundW = minBoundW;
	boundE = maxBoundE;
}

var bounds = new L.LatLngBounds(new L.LatLng(boundN, boundE), new L.LatLng(boundS, boundW));

// Map definition
var maxZoom = 17;
var minZoom = 5;
var defaultZoom = 6;
var mapCenter = new L.latLng(47,2);
var map = L.map('map', {
		fullscreenControl: true,
		center: mapCenter,
		zoom: defaultZoom,
		minZoom: minZoom,
		maxZoom: maxZoom,
		maxBounds: bounds
	});

// Add branding and license links
L.tileLayer(
	'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', 
	{
		attribution: 'Map data &copy; '+
			'<a href="http://openstreetmap.org">OpenStreetMap</a> contributors, '+
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, '+
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		maxZoom: maxZoom,
		id: 'mapbox.streets',
		accessToken: 'pk.eyJ1IjoidnJhY2FuYW50ZXMiLCJhIjoiY2prZ21vaWMxMDVxZTNwcm5wZ29vbmY2aCJ9.cBMOReBbeqSWQA3nWsGnuw'
	}
).addTo(map);

/**
 * Load data from cache first
 */
var shopsJson, jtbPartners;
$(document).ready(function(){
	initSubGroups(map);
	
	$.when(
	    $.getJSON('cache_data.json', function(response) {
	        shopsJson = response.elements
	    }),
	    $.getJSON('jtb_partners.json', function(response) {
	        jtbPartners = response.elements
	    })
	).then(function() {
	    addListOfShops();
	});
});

/**
 * Take a list of shops as JSON and display them in a cluster on the map
 **/
function addListOfShops() {	
	for (var shopIndex in shopsJson) {
		var shop = shopsJson[shopIndex]
		var shopTags = shop['tags'];
		var lat, lon;

		// Get coordinates
		if (shop['type'] == "way") {
			// As ways are a list of nodes, we have to get the center node
			var shopCenter = shop['center'];
			if (shopCenter) {
				lat = shopCenter['lat'];
				lon = shopCenter['lon'];
			}	
		} else {
			lat = shop['lat'];
			lon = shop['lon'];
		}

		// check minimum information to display a marker
		if (!lat || !lon) {
			console.log("No coordinates found for shop: id="+shop['id']+" ; name="+name);
			continue;
		}

		// Get the type of shop/amenity to manage
		var type = getType(shopTags['name'], shopTags['shop'], shopTags['amenity'], shopTags['craft']);
		if (!type) {
			console.log("No type found for shop: id="+shop['id']+" ; name="+name);
			continue;
		}

		// Create popup content depending on element's tags
		var popup = getPopupContent(
				shop['id'],
				shopTags['name'],
				shopTags['organic'],
				shopTags['bulk_purchase'],
				shopTags['addr:housenumber'],
				shopTags['addr:street'],
				shopTags['addr:postcode'],
				shopTags['addr:city'],
				shopTags['opening_hours'],
				shopTags['website'],
				shopTags['contact:website'],
				shopTags['facebook'],
				shopTags['contact:facebook'],
				type
		);

		// Check that popup has been correctly created
		if (!popup) {
			console.log("No popup found for shop : id="+shop['id']+" ; name="+name);
			continue;
		}
		
		addMarkerToMap(type, popup, lat, lon);
	}
}

/**
 * Format shop information into an html style string for the popup
 **/
function getPopupContent(
		nodeId,
		name,
		organic,
		bulk_purchase,
		housenumber,
		street,
		postcode,
		city,
		opening_hours,
		website,
		contactWebsite,
		facebookUrl,
		contactFacebookUrl,
		type
){

	// Check that name exists
	if (!name) {
		return null;
	}
	var popup = '<b>'+name+'</b><br />';

	// Set the shop type
	var shopTitle = getShopTitle(type, organic, bulk_purchase);
	if (shopTitle) {
		popup += '<i>' + shopTitle ;

		if (name == "Green Shopper") {
			popup += ' en ligne';	
		}

		popup += '</i><br />';
	}
		
	popup += getHtmlFormattedAddress(housenumber, street, postcode, city);	
	popup += getHtmlFormattedHours(opening_hours);
	popup += getHtmlFormattedWebsite(website, contactWebsite, facebookUrl, contactFacebookUrl);
	popup += getHtmlFormattedPartnerships(nodeId);
	return popup;
}

/**
 * @return an HTML formatted list of partners
 */
function getHtmlFormattedPartnerships(nodeId) {
	var partners = "";

	if (isJaimeTesBocauxPartner(nodeId)){
	    partners += '<hr style="padding-bottom: ;padding-bottom: 0px;" size="1">';
	    partners += '<div style="display: flex;"><img style="height: 50px;" src="jtb.png"/><div style="margin: auto; font-weight: bold;">Partenaire <br />J\'aime tes bocaux</div></div>';
    }

	return partners;
}

/**
 * Check if the shop is a partner of the organization "J'aime tes bocaux"
 * @param nodeId the id of the element
 * @return true if it's a "J'aime tes bocaux" partner, false otherwise
 */
function isJaimeTesBocauxPartner(nodeId) {

    for (var groupIndex in jtbPartners) {
    	var group = jtbPartners[groupIndex];
		for (var idIndex in group.ids) {
			var id = group.ids[idIndex];
			if (id == nodeId) {
	       		return true;
	       	}
		}
	}

 	return false;
}
