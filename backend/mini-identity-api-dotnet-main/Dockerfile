FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS base
WORKDIR /app
EXPOSE 5132

FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src
COPY src/MiniIdentityApi.Domain/MiniIdentityApi.Domain.csproj src/MiniIdentityApi.Domain/
COPY src/MiniIdentityApi.Application/MiniIdentityApi.Application.csproj src/MiniIdentityApi.Application/
COPY src/MiniIdentityApi.Infrastructure/MiniIdentityApi.Infrastructure.csproj src/MiniIdentityApi.Infrastructure/
COPY src/MiniIdentityApi.Api/MiniIdentityApi.Api.csproj src/MiniIdentityApi.Api/
RUN dotnet restore src/MiniIdentityApi.Api/MiniIdentityApi.Api.csproj
COPY src/ src/
RUN dotnet publish src/MiniIdentityApi.Api/MiniIdentityApi.Api.csproj -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5132
ENV ASPNETCORE_ENVIRONMENT=Development
ENTRYPOINT ["dotnet", "MiniIdentityApi.Api.dll"]
