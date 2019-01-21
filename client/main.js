let map;
function createMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 37.7, lng: -122.5},
    zoom: 8.5
  });

  let legend = document.createElement('div');
  new Legend(legend);

  legend.index = 1;
  map.controls[google.maps.ControlPosition.LEFT_CENTER].push(legend);

  loadDisplayTripData();
}

class Legend {
    constructor(controlDiv) {
        //Align the UI Element
        controlDiv.style.marginLeft = '10px';

        //Create the InnerUI Element and Style
        let legend = document.createElement('div');
        legend.style.backgroundColor = '#fff';
        legend.style.border = '2px solid #fff';
        legend.style.borderRadius = '3px';
        legend.style.marginBottom = '22px';
        legend.style.textAlign = 'center';
        legend.title = 'Legend';
        controlDiv.appendChild(legend);
      
        //Add UI Element Text
        let controlText = document.createElement('div');
        controlText.style.color = 'rgb(25,25,25)';
        controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
        controlText.style.fontSize = '16px';
        controlText.style.lineHeight = '38px';
        controlText.style.paddingLeft = '5px';
        controlText.style.paddingRight = '5px';
        controlText.innerHTML = `<h4 style='height: 25px; margin-bottom: -30px; margin-top: 0px;'>Speeds</h4>
        <h6 style='height: 25px; margin-bottom: -10px; font-style: italic;'> Gradient Between Following Colors </h6>
        <div style='display: block;'>
          <div style='display:inline-flex; height: 35px; margin-bottom: -15px;'> <div style='width: 20px; height: 20px; background-color: #FF0000; margin-top: 25px; margin-right: 5px;'> </div> <p> - 0 MPH</div> </p> </div>
          <div style='display:inline-flex; height: 35px; margin-bottom: -15px;'> <div style='width: 20px; height: 20px; background-color: #7F7F00; margin-top: 25px; margin-right: 5px;'> </div> <p> - 25 MPH</div> </p> </div>
          <div style='display:inline-flex; height: 35px;'> <div style='width: 20px; height: 20px; background-color: #00FF00; margin-top: 25px; margin-right: 5px;'> </div> <p> - 50+ MPH</div> </p> </div>
          <p style='margin-top: 5px; font-style: italic; height: 10px; padding-bottom: 10px;'> Click on a trip for more info. </p>
        </div>`;
        legend.appendChild(controlText);
    }
}

function loadDisplayTripData() {
    //Fetch the Number of Trips
    fetch('/trips').then((res) => {
        return res.json();
    }).then((res) => {
        let totalTrips = res.tripCount;
        for(let i = 0; i < totalTrips; i++) {
            fetch('/trip/' + i).then((res) => {
                return res.json();
            }).then((res) => {
                const SLOW = 20;
                const MEDIUM = 30;
                let currLine = [];
                let avgSpeed = 0;
                
                //Loop Through All Points to Create Gradient Lines
                res.coords.forEach((currCoord, i) => {
                    if(i === 0) {
                        currLine.push(currCoord);
                    }else if(currCoord.speed < SLOW && res.coords[i-1].speed < SLOW && currLine.length < 200 && i < res.coords.length - 1) {
                        currLine.push(currCoord);
                        avgSpeed = (currCoord.speed + res.coords[i-1].speed)/2;
                    } else if (currCoord.speed < MEDIUM && currCoord.speed >= SLOW && res.coords[i-1].speed < MEDIUM && res.coords[i-1].speed >= SLOW  && currLine.length < 200 && i < res.coords.length - 1) {
                        currLine.push(currCoord);
                        avgSpeed = (currCoord.speed + res.coords[i-1].speed)/2;
                    } else if (currCoord.speed >= MEDIUM && res.coords[i-1].speed >= MEDIUM  && currLine.length < 200 && i < res.coords.length - 1) {
                        currLine.push(currCoord);
                        avgSpeed = (currCoord.speed + res.coords[i-1].speed)/2;
                    } else {
                        let line = new google.maps.Polyline({
                            path: currLine,
                            geodesic: true,
                            strokeColor: '#' + componentToHex(255 - (avgSpeed.toFixed(0) * 5)) + componentToHex(avgSpeed.toFixed(0) * 5) + '00',
                            strokeOpacity: 0.7,
                            strokeWeight: 4
                        });

                        line.addListener('click', lineListener(res));

                        line.setMap(map);
                        if(currLine.length > 20) {
                            currLine = [];
                            currLine.push(currCoord);
                        } else {
                            currLine.push(currCoord);
                        }
                    }
                });
            })
        }
    });
}

//Creates a Line Listener, To Be Called on Line Click
function lineListener(lineData) {
    return function(event) {
        let timeTraveled = new Date(null);
        let seconds = (new Date(lineData.end_time).getTime() - new Date(lineData.start_time).getTime()) / 1000;
        timeTraveled.setSeconds(seconds);
        let marker = new google.maps.Marker({
        position: event.latLng,
        map: map
        })

        let startMarker = new google.maps.Marker({
        position: {lat: lineData.coords[0].lat, lng: lineData.coords[0].lng},
        map: map,
        animation: google.maps.Animation.DROP,
        label: 'A'
        })

        let endMarker = new google.maps.Marker({
        position: {lat: lineData.coords[lineData.coords.length - 1].lat, lng: lineData.coords[lineData.coords.length - 1].lng},
        map: map,
        animation: google.maps.Animation.DROP,
        label: 'B'
        });

        let speedAtCurrentPoint = lineData.coords[0].speed;
        let currentLowest = getDistance(lineData.coords[0],{lat: event.latLng.lat(), lng: event.latLng.lng()});
        let sum = 0;

        lineData.coords.forEach((coord) => {
        sum += coord.speed;
        if(getDistance(coord, {lat: event.latLng.lat(), lng: event.latLng.lng()}) < currentLowest) {
            currentLowest = getDistance(coord, {lat: event.latLng.lat(), lng: event.latLng.lng()})
            speedAtCurrentPoint = coord.speed;
        }
        });

        let totalAvg = sum / lineData.coords.length;

        let infoWindow = new google.maps.InfoWindow({
        content: `<div style='display: flex; flex-direction: column;'> <div style='display:inline-flex;'> <h3 style='padding-right: 5px;'>Total Time Traveled: </h3> <h4> ${timeTraveled.toISOString().substr(11, 8)} </h4> </div>
        <div style='display:inline-flex;'> <h3 style='padding-right: 5px;'> Distance Traveled (Miles): </h3> <h4> ${(lineData.coords[lineData.coords.length - 1].dist  * 1000 * 0.00062137).toFixed(2)} </h4> </div>
        <div style='display:inline-flex;'> <h3 style='padding-right: 5px;'>Speed At Current Point (MPH): </h3> <h4 style='color:${'#' + componentToHex(255 - (speedAtCurrentPoint.toFixed(0) * 5)) + componentToHex(speedAtCurrentPoint.toFixed(0) * 5) + '00'}'> ${speedAtCurrentPoint.toFixed(2)} </h4> </div>
        <div style='display:inline-flex;'> <h3 style='padding-right: 5px;'>Average Speed (MPH): </h3> <h4 style='color:${'#' + componentToHex(255 - (totalAvg.toFixed(0) * 5)) + componentToHex(totalAvg.toFixed(0) * 5) + '00'}'>${totalAvg.toFixed(2)}</h4> </div> 
        </div>`
        });

        infoWindow.open(map, marker);

        google.maps.event.addListener(infoWindow,'closeclick',function(){
        marker.setMap(null);
        startMarker.setMap(null);
        endMarker.setMap(null);
        })
    }
}

//Math Functions
function componentToHex(c) {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rad(deg) {
    return deg * Math.PI / 180;
}

function getDistance(coord1, coord2) {
    let R = 6378137; 
    let dLat = rad(coord2.lat - coord1.lat);
    let dLong = rad(coord2.lng - coord1.lng);
    let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(coord1.lat) * Math.cos(rad(coord2.lat))) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let distance = R * c;
    return distance;
};