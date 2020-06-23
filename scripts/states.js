var states = (function(){
    var csvUrl = "data/state_gap_data.csv";
    var gapData = []
    var load = function(callback) {
        if(gapData.length == 0) {
            Papa.parse(csvUrl, {
                download: true,
                header: true,
                complete: function(data) {
                    //First pass: parse data, calculate total weight
                    var totalWeight = 0.0;
                    gapData = data.data.map(function(e) {
                        var parsedData = {}
                        parsedData.state = e.State;
                        parsedData.budget = Number(e["Current c3 budget"].replace(/[^0-9.-]+/g,""));
                        parsedData.gap = Number(e["Overal 2020 c3 budget gap"].replace(/[^0-9.-]+/g,""));
                        parsedData.weight = Number(e["Priority for Weighting"]);
                        totalWeight += parsedData.weight;

                        parsedData.raised = parsedData.budget - parsedData.gap;
                        parsedData.raisedPercent = parsedData.raised / parsedData.budget;

                        return parsedData;
                    });


                    var totalFractionalShare = 0.0;
                    gapData.map((state, index, arr) => {
                        if(index == arr.length - 1) {
                            //Last state of, up until now rounding may make the slices off by ~1%
                            //Makes sure this final state's fractional share makes the total 100%
                            state.fractionalShare = 1.0 - totalFractionalShare;
                        }
                        else {
                            var exactFractionalShare = state.weight / totalWeight;
                            var roundedFractionalShare = Math.round(exactFractionalShare * 100) / 100.0;
        
                            state.fractionalShare = roundedFractionalShare;
                            totalFractionalShare += roundedFractionalShare;
                        }
        
                        console.log(`${state.weight} / ${totalWeight} = ${state.fractionalShare}`);
                    });

                    //Run callback
                    if(callback)
                        callback();
                }
            });
        }
    }

    var draw = function() {

        var stateContainer = document.getElementById("state-container");
        stateContainer.innerHTML = "";

        for(var i = 0; i < gapData.length; i++) {
            drawState(stateContainer, gapData[i]);
        }
    }

    var currencyFormatter =  new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        //Whole dollars only
        minimumFractionDigits: 0

    });
    var drawState = function(containerEl, data) {
        var stateRowId = "state-" + data.state;
        var stateRow = document.getElementById(stateRowId);
        //Create state div + progress bar if not exists
        if(!stateRow) {
            stateRow = document.createElement("ion-row");
            // stateProgressRow.setAttribute("state", data.state);
            stateRow.setAttribute("id", stateRowId);
            stateRow.innerHTML = `
                <ion-col size="4">
                    <ion-item>
                        <ion-label>${data.state}</ion-label>
                        <ion-checkbox slot="start" name="state" value="${data.state}"></ion-checkbox>
                    </ion-item>
                </ion-col>
            `;

            var progressCol = document.createElement("ion-col");
            progressCol.setAttribute("size", "8");

            
            var startColor = getComputedStyle(document.documentElement).getPropertyValue('--ion-color-primary');
            var endColor = '#6FD57F';
            var line = new ProgressBar.Line(progressCol, {
                color: 'var(--ion-color-primary)',
                strokeWidth: 4,
                trailColor: '#eee',
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
                    style: {
                        color: '#FFF'
                    },
                },
            });
            line.animate(data.raisedPercent);

            stateRow.appendChild(progressCol);
            containerEl.appendChild(stateRow);
        }
    }

    return {
        load: load,
        draw: draw,
    }
})();