import mlflow

# Set the tracking URI (should be default)
mlflow.set_tracking_uri("http://127.0.0.1:5000")

# Start a test run
with mlflow.start_run(run_name="test_run"):
    mlflow.log_param("test_param", "hello")
    mlflow.log_metric("test_metric", 0.99)
    print("Test run logged successfully!")

# List all experiments
print("\nAll experiments:")
for exp in mlflow.search_experiments():
    print(f"  - {exp.name} (ID: {exp.experiment_id})")
    
# List runs for chest_xray_classification
experiment = mlflow.get_experiment_by_name("chest_xray_classification")
if experiment:
    runs = mlflow.search_runs(experiment_ids=[experiment.experiment_id])
    print(f"\nRuns in chest_xray_classification: {len(runs)}")
    if len(runs) > 0:
        print(runs[['run_id', 'status', 'start_time']])