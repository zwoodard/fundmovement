var allocations = (function() {
    var csvUrl = "data/org_data.csv";
    var orgData = [];

    var load = function(callback) {
        if(orgData.length == 0) {
            Papa.parse(csvUrl, {
                download: true,
                header: true,
                complete: function(data) {
                    orgData = data.data.map(function(e) {
                        var org = {}

                        org.state = e.State;
                        org.orgName = e["Organization c3"];
                        //Budget data
                        org.budget = Number(e["Current Budget c3"].replace(/[^0-9.-]+/g,""));
                        org.gap = Number(e["Overall 2020 c3 Gap"].replace(/[^0-9.-]+/g,""));

                        //Strategy data
                        //NOTE: csv values should already be truthy, we just convert them here to simplify
                        org.democraticParticipation = !!e["Democratic Participation"];
                        org.voterProtection = !!e["Voter Protection"];
                        org.governance = !!e["Governance Training & Capacity Building"];
                        org.boldPolicies = !!e["Moving on Bold Policies"];
                        org.narrativeChange = !!e["Narrative Change"];
                        org.sustainability = !!e["Sustainability"];
                        
                        //Weight
                        org.weight = Number(e["Weighting WITHIN STATE"]);

                        return org;
                    });
                    
                    if(callback)
                        callback();
                }
            });
        }
    }

    function calculateDefaultAllocations() {
        var strategies = ["cogovernance", "voterprotectionandeducation", "narrativechange", "sustainability"];
        var totalDonationAmount = Number(document.getElementById("donationAmount").value);
        var selectedStrategies = strategies.filter(strat => document.getElementById(strat).checked);
        var selectedStates = Array.from(document.querySelectorAll(`ion-checkbox[name='state']`))
            .filter(checkbox => checkbox.checked).map(checkbox => checkbox.value);

        var fitsStrategyCriteria = {
            "cogovernance" : org => org.governance || org.boldPolicies,
            "voterprotectionandeducation" : org => org.voterProtection || org.democraticParticipation,
            "narrativechange" : org => org.narrativeChange,
            "sustainability" : org => org.sustainability,
        };

        var matchingOrgs = orgData.filter(function(org) {
            var matchesState = selectedStates.includes(org.state);
            var matchesStrategy = selectedStrategies.some(strategy => fitsStrategyCriteria[strategy](org));
            return matchesState && matchesStrategy;
        });
        

        var orgAllocations = {};
        for(var stateCode of selectedStates) {

            var orgsInState = matchingOrgs.filter(org => org.state == stateCode);
            //No orgs matching the strat criteria in this state, skip it
            if(orgsInState.length == 0)
                continue;

            var totalOrgWeightForState = orgsInState.reduce((t, org) => t + org.weight, 0.0);

            var totalFractionalShare = 0.0;
            orgAllocations[stateCode] = orgsInState.map((org, index, arr) => {
                if(index == arr.length - 1) {
                    //Last org of the state, up until now rounding may make the slices off by ~1%
                    //Makes sure this final org's fractional share makes the total 100%
                    org.fractionalShare = 1.0 - totalFractionalShare;
                }
                else {
                    var exactFractionalShare = org.weight / totalOrgWeightForState;
                    var roundedFractionalShare = Math.round(exactFractionalShare * 100) / 100.0;

                    org.fractionalShare = roundedFractionalShare;
                    totalFractionalShare += roundedFractionalShare;
                }

                return {
                    orgName: org.orgName,
                    fractionalShare: org.fractionalShare,
                    allocation: (org.fractionalShare * totalDonationAmount)
                };
            });
        }
        return orgAllocations;
    }
    
    var needsRedraw = true;
    var draw = function() {
        if(!needsRedraw)
            return;
        needsRedraw = false;

        //Clear any existing content, happens when we redraw page. E.g. user goes back to info and changes their states
        var containerEl = document.getElementById("allocations-container");
        containerEl.innerHTML = "";

        //Calculate the actual data we need
        var orgAllocationsByState = calculateDefaultAllocations();

        //Output allocations as an input to allow user too change it

        for(var stateCode in orgAllocationsByState) {

            var stateHeader = document.createElement("ion-row");
            stateHeader.innerHTML = `
                <ion-col>
                    <ion-text><h2>${stateCode}</h2></ion-text>
                </ion-col>
                <ion-col>
                    <ion-text><h2>Share of ${stateCode}'s Allocation</h2></ion-text>
                </ion-col>
                `;
            containerEl.appendChild(stateHeader)

            var orgAllocations = orgAllocationsByState[stateCode];

            for(var orgAllocation of orgAllocations) {
                var orgAllocationItem = document.createElement("ion-row");
                orgAllocationItem.classList.add("ion-align-items-center");
                orgAllocationItem.innerHTML = `
                    <ion-col size="5">
                        <h4>${orgAllocation.orgName}</h4>
                    </ion-col>
                    <ion-col size="7">
                        <ion-range data-state="${stateCode}" min="0" max="100" step="1" pin ticks snaps value="${(orgAllocation.fractionalShare * 100.0)}">
                            <ion-text class="percent" slot="start">${(orgAllocation.fractionalShare * 100.0).toFixed(0)}</ion-text>
                            <ion-icon size="small" slot="start" name="logo-usd"></ion-icon>
                            <ion-icon size="large" slot="end" name="logo-usd"></ion-icon>
                        </ion-range>
                    </ion-col>
                `;

                containerEl.appendChild(orgAllocationItem);
            }

            var totalAllocation = document.createElement("ion-row");
            totalAllocation.classList.add("ion-align-items-center");
            totalAllocation.id = "state-total-" + stateCode;
            totalAllocation.innerHTML = `
                <ion-col size="5">
                    <h4>Total</h4>
                </ion-col>
                <ion-col size="1">
                    <ion-text class="percent">100</ion-text>
                </ion-col>
            `;

            containerEl.appendChild(totalAllocation);

            containerEl.addEventListener("ionChange", (e) => {
                var stateCode = e.target.dataset.state;
                e.target.getElementsByClassName("percent")[0].innerHTML = e.detail.value;
                var stateTotal = Array.from(containerEl.querySelectorAll(`ion-range[data-state='${stateCode}']`))
                    .reduce((total, ionRange) => total + Number(ionRange.value), 0.0);

                var percentageEl = e.currentTarget.querySelector(`#state-total-${stateCode} .percent`);
                if(stateTotal > 100 && percentageEl.getAttribute("color") != "danger") {
                    percentageEl.setAttribute("color", "danger");
                }
                else if(stateTotal <= 100 && percentageEl.getAttribute("color") == "danger"){
                    percentageEl.setAttribute("color", "");
                }
                percentageEl.innerHTML = stateTotal.toFixed(0);
            });
        }
    }

    var redraw = function() {
        needsRedraw = true;
        draw();
    }


    return {
        load: load,
        draw: draw,
        redraw: redraw
    }
})();