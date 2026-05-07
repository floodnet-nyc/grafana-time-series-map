mkdir -p provisioning/plugins
wget https://github.com/motherduckdb/grafana-duckdb-datasource/releases/download/v0.4.1/motherduck-duckdb-datasource-0.4.1.zip
unzip motherduck-duckdb-datasource-0.4.1.zip -d provisioning/plugins
rm motherduck-duckdb-datasource-0.4.1.zip
