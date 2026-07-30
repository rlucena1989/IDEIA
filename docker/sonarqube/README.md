# SonarQube for Technical Debt Tracking

This directory contains SonarQube setup for continuous code quality analysis and technical debt tracking.

## Quick Start

```bash
cd docker/sonarqube
docker-compose up -d
```

Access SonarQube at http://localhost:9000 (admin/admin)

## Configuration

### SonarQube Server
- **Version**: 9.9.3-community
- **Database**: PostgreSQL 15
- **Port**: 9000

### Quality Gate

Default quality gate settings:
- **Coverage**: > 80%
- **Duplicated Lines**: < 3%
- **Maintainability Rating**: A
- **Reliability Rating**: A
- **Security Rating**: A
- **Technical Debt Ratio**: < 5%

## Project Setup

1. Create a new project in SonarQube
2. Generate a token
3. Add secrets to GitHub:
   - `SONAR_TOKEN`: Your SonarQube token
   - `SONAR_HOST_URL`: Your SonarQube server URL

## Local Analysis

```bash
# Install SonarQube Scanner
npm install -g sonarqube-scanner

# Run analysis
sonar-scanner \
  -Dsonar.projectKey=ideia \
  -Dsonar.sources=packages \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=your-token
```

## Metrics Tracked

### Code Quality
- **Bugs**: Potential bugs in code
- **Vulnerabilities**: Security vulnerabilities
- **Code Smells**: Maintainability issues
- **Duplications**: Code duplication percentage

### Coverage
- **Line Coverage**: Percentage of lines covered
- **Branch Coverage**: Percentage of branches covered
- **Function Coverage**: Percentage of functions covered

### Technical Debt
- **Technical Debt Ratio**: Time to fix issues / time to develop
- **Debt Ratio**: Calculated based on remediation cost
- **Maintainability Rating**: A (best) to E (worst)

## Integration with CI/CD

The `.github/workflows/sonarqube.yml` workflow:
- Runs on every PR and push to main/develop
- Executes tests with coverage
- Uploads results to SonarQube
- Comments on PR with analysis results
- Fails if quality gate is not met

## Quality Gate Customization

Create custom quality gates in SonarQube UI:
1. Go to Quality Gates
2. Create new gate
3. Add conditions for:
   - Coverage threshold
   - Duplicated lines
   - Maintainability rating
   - Technical debt ratio
4. Set as default for project

## Technical Debt Calculation

SonarQube calculates technical debt based on:
- **Remediation cost**: Time to fix issues
- **Development cost**: Time to develop code
- **Formula**: (Remediation cost / Development cost) × 100

### Example
If fixing issues takes 10 hours and developing took 100 hours:
- Technical debt ratio = 10%
- Rating = B (good)

## Best Practices

1. **Fix critical issues first**: Address bugs and vulnerabilities
2. **Reduce code duplication**: Extract common logic
3. **Improve test coverage**: Aim for > 80%
4. **Refactor complex code**: Reduce cyclomatic complexity
5. **Address code smells**: Improve maintainability

## Troubleshooting

### Analysis fails
- Check SONAR_TOKEN is valid
- Verify SONAR_HOST_URL is accessible
- Ensure project key matches SonarQube project

### Coverage not showing
- Generate lcov report: `npm test -- --coverage --coverageReporters=lcov`
- Verify path in sonar-project.properties
- Check coverage file exists: `coverage/lcov.info`

### Quality gate fails
- Review failed conditions in SonarQube
- Check analysis results for specific issues
- Adjust quality gate thresholds if needed

## Maintenance

### Backup database
```bash
docker exec ideia-sonarqube-db pg_dump -U sonar sonar > backup.sql
```

### Backup configuration
```bash
docker cp ideia-sonarqube:/opt/sonarqube/conf ./backup-config
```

### Upgrade SonarQube
```bash
docker-compose pull
docker-compose up -d
```

## Resources

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [SonarQube Scanner for JS/TS](https://docs.sonarqube.org/latest/analyzing-source-code/languages/javascript/)
- [Quality Gates](https://docs.sonarqube.org/latest/user-guide/quality-gates/)
