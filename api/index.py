from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
from pyomo.environ import *
import highspy

app = FastAPI()

# Frontend (3000) ile Backend (8000) konuşabilsin diye CORS izni
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class OptRequest(BaseModel):
    n_facilities: int = 10
    n_customers: int = 60
    fuel_price: float = 25.0
    trip_frequency: int = 20

@app.post("/api/solve")
def solve_logistics(req: OptRequest):
    # 1. VERİ ÜRETİMİ
    np.random.seed(42)
    facilities = pd.DataFrame({
        'id': range(req.n_facilities),
        'x': np.random.randint(0, 100, req.n_facilities),
        'y': np.random.randint(0, 100, req.n_facilities),
        'capacity': np.random.randint(1500, 2500, req.n_facilities),
        'fixed_cost': np.random.randint(100000, 250000, req.n_facilities)
    })
    customers = pd.DataFrame({
        'id': range(req.n_customers),
        'x': np.random.randint(0, 100, req.n_customers),
        'y': np.random.randint(0, 100, req.n_customers),
        'demand': np.random.randint(20, 50, req.n_customers)
    })

    transport_cost = {}
    for f in facilities.itertuples():
        for c in customers.itertuples():
            dist = np.sqrt((f.x - c.x)**2 + (f.y - c.y)**2)
            cost = round(dist * req.fuel_price * req.trip_frequency, 2)
            transport_cost[(f.id, c.id)] = cost

    # 2. MODELLEME
    model = ConcreteModel()
    model.I = Set(initialize=facilities['id'].tolist())
    model.J = Set(initialize=customers['id'].tolist())
    
    cap_dict = facilities.set_index('id')['capacity'].to_dict()
    fixed_dict = facilities.set_index('id')['fixed_cost'].to_dict()
    demand_dict = customers.set_index('id')['demand'].to_dict()

    model.y = Var(model.I, within=Binary)
    model.x = Var(model.I, model.J, within=Binary)

    def obj_rule(m):
        return sum(fixed_dict[i] * m.y[i] for i in m.I) + \
               sum(transport_cost[(i,j)] * m.x[i,j] for i in m.I for j in m.J)
    model.Obj = Objective(rule=obj_rule, sense=minimize)

    def demand_rule(m, j):
        return sum(m.x[i, j] for i in m.I) == 1
    model.Cons_Demand = Constraint(model.J, rule=demand_rule)

    def capacity_rule(m, i):
        return sum(demand_dict[j] * m.x[i, j] for j in m.J) <= cap_dict[i] * m.y[i]
    model.Cons_Cap = Constraint(model.I, rule=capacity_rule)
    
    def linking_rule(m, i, j):
        return m.x[i, j] <= m.y[i]
    model.Cons_Link = Constraint(model.I, model.J, rule=linking_rule)

    # 3. ÇÖZÜM
    solver = SolverFactory('appsi_highs')
    solver.options = {'time_limit': 8}
    solver.solve(model)

    # 4. DETAYLI SONUÇ HAZIRLAMA
    opened_indices = [i for i in model.I if value(model.y[i]) > 0.5]
    
    # Tüm tesislerin listesi (Durum ve Maliyet ile)
    facility_report = []
    for i in model.I:
        fac = facilities.iloc[i]
        is_open = i in opened_indices
        facility_report.append({
            "id": int(fac['id']),
            "x": int(fac['x']),
            "y": int(fac['y']),
            "fixed_cost": int(fac['fixed_cost']),
            "capacity": int(fac['capacity']),
            "status": "ACTIVE" if is_open else "CLOSED"
        })

    assignments = []
    for i in model.I:
        if value(model.y[i]) > 0.5:
            for j in model.J:
                if value(model.x[i, j]) > 0.5:
                    assignments.append({
                        "facility_id": int(i),
                        "customer_id": int(j),
                        "cust_x": int(customers.iloc[j]['x']),
                        "cust_y": int(customers.iloc[j]['y'])
                    })

    return {
        "status": "Optimal",
        "total_cost": value(model.Obj),
        "opened_count": len(opened_indices),
        "facility_report": facility_report, # Tüm tesisler burada
        "assignments": assignments,
        "all_customers": customers.to_dict(orient="records")
    }