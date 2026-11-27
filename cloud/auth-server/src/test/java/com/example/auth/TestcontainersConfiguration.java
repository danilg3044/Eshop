package com.example.auth;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.mssqlserver.MSSQLServerContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Starts a throw-away SQL Server in Docker and points the datasource at it (@ServiceConnection),
 * so integration tests never touch your local database. Requires Docker Desktop to be running.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	MSSQLServerContainer sqlServerContainer() {
		return new MSSQLServerContainer(DockerImageName.parse("mcr.microsoft.com/mssql/server:2022-latest"))
				.acceptLicense();
	}

}
