let transactions = [];
let myChart;

async function  updateAndGetData(){
  console.log("getting pending")
  const pending = JSON.parse(localStorage.getItem("pending"));
  console.log(pending)

  if (pending){
    fetch("/api/transaction/bulk", {
      method: "POST",
      body: JSON.stringify(pending),
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json"
      }
    }).then(async ()=>{
          localStorage.setItem("pending","");
          renderChart();
        }

      );
  }
  else{
    renderChart();
  }
}
updateAndGetData();

function renderChart(){
  fetch("/api/transaction")
  .then(response => {
    console.log("first then runs");
    return response.json();
  })
  .then(async function(data) {
    // save db data on global variable
    console.log("seceont thend runs");
    transactions = data;
    localStorage.setItem("budget", JSON.stringify(data));
    populateTotal();
    populateTable();
    populateChart();
  }).catch(err=>{
    console.log("in the console because we failed to get the data");
    transactions = JSON.parse(localStorage.getItem("budget"));
    populateTotal();
    populateTable();
    populateChart();
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

  //add to the beginning of the local storage
  let budget = JSON.parse(localStorage.getItem("budget"));
  if(!budget){
    budget=[];
  }
  budget.unshift(transaction);
  localStorage.setItem("budget",JSON.stringify(budget));


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
    // fetch failed, so save in local storage
//    saveRecord(transaction);

    let pending = JSON.parse(localStorage.getItem("pending"));
    if(!pending){
      pending = [];
    }
    pending.unshift(transaction);
    localStorage.setItem("pending",JSON.stringify(pending));
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

