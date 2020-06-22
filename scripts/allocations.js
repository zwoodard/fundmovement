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

    function determineAllocations() {
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

            var totalStateWeight = orgsInState.reduce((t, org) => t + org.weight, 0.0);

            orgAllocations[stateCode] = orgsInState.map(org => {
                //Calculate each org's slice of the state's slice
                org.fractionalShare = org.weight / totalStateWeight;
                console.log(`${org.weight} / ${totalStateWeight} = ${org.fractionalShare}`)
                return {
                    orgName: org.orgName,
                    fractionalShare: org.fractionalShare,
                    allocation: (org.fractionalShare * totalDonationAmount)
                };
            })
        }

        return orgAllocations;

        // var totalWeight = matchingOrgs.map(org => org.weight).reduce((total, weight) => total + weight);
        // var orgAllocations = matchingOrgs.map(function(org) {
        //     var absoluteWeight = org.weight / totalWeight;
        //     return {
        //         orgName: org.orgName,
        //         absoluteWeight: absoluteWeight,
        //         allocation: (absoluteWeight * totalDonationAmount)
        //     };
        // });

        // return orgAllocations;
    }

    var calculateTotal = function() {
        var total = 0.0;
        for(var ele of document.querySelectorAll(".finalDonationAllocation")) {
            total += Number(ele.value);
        }
        return total;
    }
    
    var needsRedraw = true;
    var draw = function() {
        console.log("Drawing - " + needsRedraw)
        if(!needsRedraw)
            return;
        needsRedraw = false;

        //Clear any existing content, happens when we redraw page. E.g. user goes back to info and changes their states
        var containerEl = document.getElementById("allocations-container");
        containerEl.innerHTML = "";

        //Calculate the actual data we need
        var orgAllocationsByState = determineAllocations();

        //Output allocations as an input to allow user too change it

        for(var stateCode in orgAllocationsByState) {

            var stateHeader = document.createElement("ion-row");
            stateHeader.innerHTML = `<ion-col><ion-text><h2>${stateCode}</h2></ion-text></ion-col>`;
            containerEl.appendChild(stateHeader)

            var orgAllocations = orgAllocationsByState[stateCode];

            for(var orgAllocation of orgAllocations) {
                console.log("drawing " + orgAllocation.orgName);
                console.log(orgAllocation);
                var orgAllocationItem = document.createElement("ion-row");
    
                orgAllocationItem.innerHTML = `
                    <ion-col size="5">
                        <h4>${orgAllocation.orgName}</h4>
                    </ion-col>
                    <ion-col size="7">
                        <ion-range min="0" max="100" step="1" pin ticks snaps value="${orgAllocation.fractionalShare * 100.0}">
                            <ion-icon size="small" slot="start" name="logo-usd"></ion-icon>
                            <ion-icon size="large" slot="end" name="logo-usd"></ion-icon>
                        </ion-range>
                    </ion-col>
                `;
                containerEl.appendChild(orgAllocationItem);
            }
        }

        // var total = Number(0.0);
        // for(var orgAllocation of orgAllocations) {
        //     total += orgAllocation.allocation;
        //     var orgAllocationItem = document.createElement("ion-item");

        //     orgAllocationItem.innerHTML = `
        //         <ion-label position="stacked">${orgAllocation.orgName}</ion-label>
        //         <ion-input type="number" class="currency finalDonationAllocation" value="${orgAllocation.allocation.toFixed(2)}"></ion-input>
        //     `;

        //     containerEl.appendChild(orgAllocationItem);
        // }

        // var totalItem = document.createElement("ion-item");
        // totalItem.innerHTML = `
        //     <ion-label position="stacked">Total</ion-label>
        //     <ion-input readonly id="totalDonation" type="number" class="currency" value="${total.toFixed(2)}"></ion-input>
        // `;
        // containerEl.appendChild(totalItem);

        
        // for(var ele of document.querySelectorAll(".finalDonationAllocation")) {
        //     ele.addEventListener("change", function() {
        //         console.log("Changed donation");
        //         document.getElementById("totalDonation").value = calculateTotal().toFixed(2);
        //     });
        // }
    }

    var redraw = function() {
        console.log("Triggering redraw, was " + needsRedraw)
        needsRedraw = true;
        draw();
    }


    return {
        load: load,
        draw: draw,
        redraw: redraw
    }
})();