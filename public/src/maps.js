var map, infoWindow;
var userLat = document.getElementById('userLat');
var userLon = document.getElementById('userLon');
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: userLat, lng: userLon},
        zoom: 15
    });
    infoWindow = new google.maps.InfoWindow;

    // Try HTML5 geolocation.
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            userLat.value = position.coords.latitude;
            userLon.value = position.coords.longitude;

            infoWindow.setPosition(pos);
            infoWindow.setContent('You are here.');
            infoWindow.open(map);
            map.setCenter(pos);
        }, function() {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
                          'Error: The Geolocation service failed.' :
                          'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
}

function updateMap(docLat, docLon, docName) {
    var doctorloc = {lat: docLat, lng: docLon};
    var marker = new google.maps.Marker({
        position: doctorloc,
        map: map,
        title: "Dr. " + docName
    });
    map.setCenter({lat: docLat, lng: docLon});
    map.setZoom(12);
}