var allocations = (function() {
    var csvUrl = "data/org_data.csv";
    var orgData = [];


    var loadData = function() {
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
                }
            });
        }
    }

    function determineAllocations() {
        var strategies = ["cogovernance", "voterprotectionandeducation", "narrativechange", "sustainability"];
        var states = ["ntl", "az", "co", "fl", "ga", "mi", "mn", "nc", "nv", "pa", "tx", "va"];
        var selectedStrategies = strategies.filter(strat => document.getElementById(strat).checked);
        var selectedStates = states.filter(state => document.querySelector(`ion-checkbox[name='${state}']`).checked);

        var fitsStrategy = {
            "cogovernance" : org => org.governance || org.boldPolicies,
            "voterprotectionandeducation" : org => org.voterProtection || org.democraticParticipation,
            "narrativechange" : org => org.narrativeChange,
            "sustainability" : org => org.sustainability,
        };

        var matchingOrgs = orgData.filter(function(org) {
            var matchesState = selectedStates.includes(org.state.toLowerCase());
            console.log(`${org.state} ${matchesState}`);
            var matchesStrategy = selectedStrategies.some(strategy => fitsStrategy[strategy](org));
            return matchesState && matchesStrategy;
        });
        
        var totalDonationAmount = Number(document.getElementById("donationAmount").value);
        console.log(totalDonationAmount);
        var totalWeight = matchingOrgs.map(org => org.weight).reduce((total, weight) => total + weight);
        var orgAllocations = matchingOrgs.map(function(org) {
            var absoluteWeight = org.weight / totalWeight;
            return {
                orgName: org.orgName,
                absoluteWeight: absoluteWeight,
                allocation: (absoluteWeight * totalDonationAmount)
            };
        });

        return orgAllocations;
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
        if(!needsRedraw)
            return;
        needsRedraw = false;
        //Clear any existing content, happens when we redraw page. E.g. user goes back to info and changes their states
        var container = document.getElementById("allocationsContainer");
        container.innerHTML = "";

        //Calculate the actual data we need
        var orgAllocations = determineAllocations();

        //Output allocations as an input to allow user too change it
        var total = Number(0.0);
        for(var orgAllocation of orgAllocations) {
            total += orgAllocation.allocation;
            var orgAllocationItem = document.createElement("ion-item");

            orgAllocationItem.innerHTML = `
                <ion-label position="stacked">${orgAllocation.orgName}</ion-label>
                <ion-input type="number" class="currency finalDonationAllocation" value="${orgAllocation.allocation.toFixed(2)}"></ion-input>
            `;

            container.appendChild(orgAllocationItem);
        }

        var totalItem = document.createElement("ion-item");
        totalItem.innerHTML = `
            <ion-label position="stacked">Total</ion-label>
            <ion-input readonly id="totalDonation" type="number" class="currency" value="${total.toFixed(2)}"></ion-input>
        `;
        container.appendChild(totalItem);

        
        for(var ele of document.querySelectorAll(".finalDonationAllocation")) {
            ele.addEventListener("change", function() {
                console.log("Changed donation");
                document.getElementById("totalDonation").value = calculateTotal().toFixed(2);
            });
        }
    }

    var redraw = function() {
        console.log("Triggering redraw, was " + needsRedraw)
        needsRedraw = true;
    }


    return {
        loadData: loadData,
        draw: draw,
        redraw: redraw
    }
})();