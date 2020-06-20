var stateGaps = (function(){
    var csvUrl = "data/state_gap_data.csv";
    var gapData = []
    var loadData = function() {
        if(gapData.length == 0) {
            Papa.parse(csvUrl, {
                download: true,
                header: true,
                complete: function(data) {
                    gapData = data.data.map(function(e) {
                        var parsedData = {}
                        parsedData.state = e.State;
                        parsedData.budget = Number(e["Current c3 budget"].replace(/[^0-9.-]+/g,""));
                        parsedData.gap = Number(e["Overal 2020 c3 budget gap"].replace(/[^0-9.-]+/g,""));
                        parsedData.weight = Number(e["Priority for Weighting"]);

                        parsedData.raised = parsedData.budget - parsedData.gap;
                        parsedData.raisedPercent = parsedData.raised / parsedData.budget;

                        return parsedData;
                    });
                }
            });
        }
    }

    var currencyFormatter =  new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        //Whole dollars only
        minimumFractionDigits: 0

    });
    var addProgressBar = function(data) {
        var stateProgressId = "stategap_" + data.state;
        var stateProgressRow = document.getElementById(stateProgressId);
        //Create state div + progress bar if not exists
        if(!stateProgressRow) {
            var stateProgressColId = stateProgressId + "_col";
            stateProgressRow = document.createElement("ion-row");
            // stateProgressRow.setAttribute("state", data.state);
            stateProgressRow.setAttribute("id", stateProgressId);
            stateProgressRow.innerHTML = `
            <ion-col id="${stateProgressColId}">
            <ion-text><h2>${data.state}<h2></ion-text>
            </ion-col>
            `;

            document.getElementById("gapcontainer").appendChild(stateProgressRow);

            var startColor = '#FC5B3F';
            var endColor = '#6FD57F';
            var line = new ProgressBar.Line("#" + stateProgressColId, {
                color: startColor,
                strokeWidth: 1.5,
                trailColor: '#eee',
                trailWidth: 0.8,
                duration: 500,
                easing: 'easeOut',
                text: {
                    value: `
                        <ion-text class="ion-float-left">
                            ${currencyFormatter.format(data.raised)}
                        </ion-text>
                        <ion-text class="ion-float-right">
                            ${currencyFormatter.format(data.gap)}
                        </ion-text>
                    `,
                    className: 'statename',
                    style: {
                        color: '#f00'
                    },
                },
                step: function(state, line, attachment) {
                    line.path.setAttribute('stroke', state.color);
                },
            });
            line.animate(data.raisedPercent, {
                from: {
                    color: startColor
                },
                to: {
                    color: endColor
                }
            });
        }
    }

    var draw = function() {
        for(var i = 0; i < gapData.length; i++) {
            addProgressBar(gapData[i]);
        }
    }

    return {
        loadData: loadData,
        draw: draw
    }
})();