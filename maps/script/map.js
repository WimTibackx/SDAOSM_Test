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
    var mapOptions = {
        center: new google.maps.LatLng(51.219448, 4.402464),
        zoom: 8
    };

    map = new google.maps.Map(document.getElementById("map-canvas"),
        mapOptions);

    mapBounds = new google.maps.LatLngBounds();

    addListeners();

    for (var i = 0; i < jsonObj.routepoint.length; i++) {
        createMarker(i);
        drawLine(i);
    }
}

/* function loadJsonData(file) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            jsonObj = JSON.parse(xhr.responseText);
            /* jsonObj.routepoint.sort(function(a,b){
             var c = Date(a.date);
             var d = Date(b.date);
             return c-d;
             }); */ /*
            for (var i = 0; i < jsonObj.routepoint.length; i++) {
                createMarker(i);
                drawLine(i);
            }
        }
    };

    xhr.open("GET", file, true);
    xhr.send();
} */

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
        mapBounds.extend(location);
        map.fitBounds(mapBounds);

        markers[index] = marker;

        google.maps.event.addListener(marker, "click", function () {
            openInfoWindow(index, marker);
        });
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
                })
            });
        });

    }
}

function openInfoWindow(index, marker) {
    if (infoWindow) {
        infoWindow.close();
    }
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

    infoWindow.open(map, marker);
}

function openStep(index) {
    if (index < markers.length) {
        map.panTo(markers[index].getPosition());
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

function control(type) {
    switch (type) {
        case 'play':
            openStep(currentStep);
            timer = setInterval(function () { // TODO: higher interval
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