 function useBudgetIndexDb(method, object, cb){
  const request = window.indexedDB.open("budgetdb", 1);

  // Create schema
  request.onupgradeneeded = event => {
    const db = event.target.result;
    
    // Creates an object store with a listID keypath that can be used to query on.
    const budget = db.createObjectStore("budget", {keyPath: 'id', autoIncrement: true});
    const pending = db.createObjectStore("pending", {keyPath: 'id', autoIncrement: true});

  }
  
  // Opens a transaction, accesses the budget objectStore and statusIndex.
  request.onsuccess = () => {
    const db = request.result;
    const budgetTransaction = db.transaction(["budget"], "readwrite");
    const pendingTransaction = db.transaction(["pending"], "readwrite");
    const budgetStore = budgetTransaction.objectStore("budget");
    const pendingStore = pendingTransaction.objectStore("pending");

    if(method==="updateBudget"){
      budgetStore.clear();
      object.forEach(item => {budgetStore.add(item)});
      cb();
    }
    else if(method==="updatePending"){
      pendingStore.clear();
      object.forEach(item => {budgetStore.add(item)});
    }
    else if(method==="addPending"){
      pendingStore.add(object);
    }else if(method==="addBudget"){
      budgetStore.add(object);
    }
    else if(method==="getPending"){
      const getPending = pendingStore.getAll();
      getPending.onsuccess = (event) => {
       
        if(event.target.result.length!==0){
          cb(event.target.result)
        }else{
          cb(false);
        }

      }
    }else if(method==="getBudget"){
      const getBudgetItems = budgetStore.getAll();
      getBudgetItems.onsuccess = (event) => {
        cb(event.target.result)
      }
      getBudgetItems.catch = (err) => {
        console.log(err);
      }
      
    }
    else if(method==="clearPending"){
      pendingStore.clear();
    }
  };
}

let transactions = [];
let myChart;

async function  updateAndGetData(){

  useBudgetIndexDb("getPending", "",function(pending){
      //if there are pending items send in bulk the items to the database.
      if (pending){

        fetch("/api/transaction/bulk", {
          method: "POST",
          body: JSON.stringify(pending),
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json"
          }
        }).then(async ()=>{
              useBudgetIndexDb("clearPending");
              renderChart();  
            }
    
          );
      }
      //otherwise if there is not any pending material render the chart
      else{
        renderChart();
      }
    
  })
 }
  //check and see if there is pending items
  
updateAndGetData();




function renderChart(){
  fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(async function(data) {
    // save db data on global variable
    transactions = data;

    useBudgetIndexDb("updateBudget",data,()=>{
      populateTotal();
      populateTable();
      populateChart();
    })


  }).catch(err=>{
    useBudgetIndexDb("getBudget","",(budgetData)=>{
      transactions = budgetData;
      populateTotal();
      populateTable();
      populateChart();
    })

  })
}

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}



function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  //add to budget in indexDB
  useBudgetIndexDb("addBudget", transaction )


  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();
  
  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  })
  .then(data => {
    if (data.errors) {
      errorEl.textContent = "Missing Information";
    }
    else {
      // clear form
      nameEl.value = "";
      amountEl.value = "";
    }
  })
  .catch(err => {

    useBudgetIndexDb("addPending",transaction);
    // clear form
    nameEl.value = "";
    amountEl.value = "";
  });
}

document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};

