var map;
var jsonObj;
var mapBounds;
var infoWindow, geoCoder;
var timer;
var currentStep = 0;
var markers = [];

// var callnr = 0;

function initialize() {
    geoCoder = new google.maps.Geocoder();
    // Geocoder: omzetten van adressen naar coordinaten

    var mapOptions = {
        center: new google.maps.LatLng(51.219448, 4.402464),
        zoom: 8
    };
    // mapOption: zoomlevel, middelpunt bepalen, ...
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions

    map = new google.maps.Map(document.getElementById("map-canvas"),
        mapOptions);
    // Nieuwe map aanmaken in een HTML-element met mapOptions

    mapBounds = new google.maps.LatLngBounds();

    addListeners();

    for (var i = 0; i < jsonObj.routepoint.length; i++) {
        createMarker(i);
        drawLine(i);
        // Voor elk punt in het JSON object wordt een marker aangemaakt en een lijn getekend naar de vorige marker
    }
}

function getLocation(point, callback) {
    var markerLocation;
    if (point.coords.lat && point.coords.lng) {
        markerLocation = new google.maps.LatLng(point.coords.lat, point.coords.lng);
        callback(markerLocation);
    } else {
        // using address to coordinate conversion
        decodeAddress(point, callback);
    }
}

// Geocoder gebruiken om adres om te zetten naar LatLng
function decodeAddress(point, callback) {
    // console.log("calling " + ++callnr);
    geoCoder.geocode({ address: point.city }, function (result, status) {
        if (status == "OK") {
            point.coords.lat = result[0].geometry.location.lat(); // 13 calls with recording of result
            point.coords.lng = result[0].geometry.location.lng(); // 20 calls without (OVER_QUERY_LIMIT; limit: 1 req/user/sec)
            callback(result[0].geometry.location);
        } else {
            console.log("Error decoding address: " + status);
            setTimeout(function () {
                decodeAddress(point, callback)
            }, 1000);
        }
    })
}

function createMarker(index) {
    getLocation(jsonObj.routepoint[index], function (location) {
        var marker = new google.maps.Marker({
            position: location,
            map: map
        });
        // Create marker with options
        // https://developers.google.com/maps/documentation/javascript/reference#MarkerOptions

        mapBounds.extend(location);
        map.fitBounds(mapBounds);
        // Variable met randen van de map vergroten om locatie te bevatten.
        // Daarna map aanpassen volgens randen in variabele

        markers[index] = marker;

        google.maps.event.addListener(marker, "click", function () {
            openInfoWindow(index, marker);
        });
        // Eventlistener toevoegen aan marker
    });
}

function drawLine(index) {
    if (index > 0) {
        // get location from previous marker
        getLocation(jsonObj.routepoint[index - 1], function (locationA) {
            // get location from current marker
            getLocation(jsonObj.routepoint[index], function (locationB) {
                var line = new google.maps.Polyline({
                    map: map,
                    path: [locationA, locationB],
                    geodesic: false,
                    strokeColor: '#FF0000',
                    strokeOpacity: 1.0,
                    strokeWeight: 2,
                    editable: true
                });
                // Nieuwe polyline aanmaken met opties
                // https://developers.google.com/maps/documentation/javascript/reference#PolylineOptions
            });
        });

    }
}

function openInfoWindow(index, marker) {
    if (infoWindow) {
        infoWindow.close();
    }
    // Door van infoWindow een globale variabele te maken zorg je ervoor dat er maar 1 infoWindow open kan zijn.
    // Als er al een infoWindow open is kan dit zo gesloten worden.
    // Meerdere infoWindows leiden al snel tot clutter.

    var point = jsonObj.routepoint[index];

    var infoContent = '<div id="infoTitle">' + (index + 1) + '. ' + point.name + '</div>';
    infoContent += '<div id="infoDesc">' + point.desc + '</div>';
    infoContent += '<ul id="infoLinks">';
    for (var i = 0; i < point.links.length; i++) {
        infoContent += '<li><a href="' + point.links[i].url + '">' + point.links[i].name + '</a></li>';
    }
    infoContent += '</ul>';

    infoWindow = new google.maps.InfoWindow({
        content: infoContent
    });
    // Nieuw infoWindow maken met options
    // https://developers.google.com/maps/documentation/javascript/reference#InfoWindowOptions

    infoWindow.open(map, marker);
    // Open het infoWindow op de kaart, vasthangend aan de marker.
    // Ook LatLng mogelijk ipv marker
}

function openStep(index) {
    if (index < markers.length) {
        map.panTo(markers[index].getPosition());
        // Zet de opgegeven locatie in het midden van de map.
        // Wanneer locatie binnen huidige mapBounds ligt gebeurt dit schuivend.

        openInfoWindow(index, markers[index]);
    } else {
        clearInterval(timer);
        currentStep = markers.length - 1;
        $('#pause').removeClass('ion-pause')
            .addClass('ion-play')
            .attr('id', 'play');
    }

    $('.disabled').removeClass('disabled').addClass('enabled');
    if (currentStep <= 0) {
        $('#first').removeClass('enabled').addClass('disabled');
        $('#prev').removeClass('enabled').addClass('disabled');
    } else if (currentStep >= markers.length - 1) {
        $('#last').removeClass('enabled').addClass('disabled');
        $('#next').removeClass('enabled').addClass('disabled');
    }
}

// Plain old JavaScript
function control(type) {
    switch (type) {
        case 'play':
            openStep(currentStep);
            timer = setInterval(function () {
                openStep(++currentStep);
            }, 2000);

            $('#play').removeClass('ion-play')
                .addClass('ion-pause')
                .attr('id', 'pause');
            break;
        case 'pause':
            clearInterval(timer);

            $('#pause').removeClass('ion-pause')
                .addClass('ion-play')
                .attr('id', 'play');
            break;
        case 'stop':
            clearInterval(timer);
            currentStep = 0;
            $('#pause').removeClass('ion-pause')
                .addClass('ion-play')
                .attr('id', 'play');
            break;
        case 'next':
            if (currentStep < markers.length - 1) {
                openStep(++currentStep);
            }
            break;
        case 'prev':
            if (currentStep > 0) {
                openStep(--currentStep);
            }
            break;
        case 'first':
            if (currentStep > 0) {
                openStep(currentStep = 0);
            }
            break;
        case 'last':
            if (currentStep < markers.length - 1) {
                currentStep = markers.length - 1;
                openStep(currentStep);
            }
            break;
        default:
            console.log('Something went wrong')

    }
}

// Plain old JavaScript listeners for every control (play, pause, ...)
function addListeners() {
    var nodes = document.getElementById('controls').children;
    for (i = 0; i < nodes.length; i++) {
        var el = nodes[i].id;
        //alert(el);
        nodes[i].addEventListener('click', function () {
            control(this.id);
        });
    }

}

google.maps.event.addDomListener(window, 'load', initialize);
// Listener