# Heroku CLI Plugin for Java [![Build Status](https://travis-ci.com/heroku/plugin-java.svg?branch=master)](https://travis-ci.com/heroku/plugin-java)

This project is a [Heroku CLI](https://cli.heroku.com/)
plugin for working with Java applications on Heroku. It provides commands for:

* [Deploying WAR files](https://devcenter.heroku.com/articles/war-deployment)
* [Deploying executable JAR files](#executable-jar-files)
* Inspecting JVMs running on Heroku with tools like `jmap` and `visualvm`

If you are using Maven, see the [Heroku Maven plugin](https://devcenter.heroku.com/articles/deploying-java-applications-with-the-heroku-maven-plugin),
which is a more robust method of WAR and JAR file deployment.

## Prerequisites

You will require the following:

* Install the [Heroku CLI](https://cli.heroku.com/)
* Create a [Heroku account](https://api.heroku.com/signup)

## Deploying WAR files

### 1. Make sure Java 7 or higher is installed

Run the following command to confirm:

```sh-session
$ java -version
java version "1.7.0_51"
Java(TM) SE Runtime Environment (build 1.7.0_51-b13)
Java HotSpot(TM) 64-Bit Server VM (build 24.51-b03, mixed mode)
```

### 2. Install this CLI plugin

```sh-session
$ heroku plugins:install java
```

### 3. Create a Heroku application

```sh-session
$ heroku create
```

### 4. Create a WAR file

You can use any method to generate a WAR file. You can use <code>maven</code>,<code>ant</code> or simply export your application from your IDE as a WAR file.

The only requirement is that the WAR file is a standard Java web application and adheres to the standard web application structure and conventions.

### 5. Deploy your WAR

In order to deploy your WAR use the following command:

```sh-session
$ heroku war:deploy <path_to_war_file> --app <app_name>
Uploading my-app.war....
---> Packaging application...
    - app: my-app
    - including: webapp-runner.jar
    - including: my-app.war
---> Creating build...
    - file: slug.tgz
    - size: 1MB
---> Uploading build...
    - success
---> Deploying...
remote:
remote: -----> Fetching custom tar buildpack... done
remote: -----> JVM Common app detected
remote: -----> Installing OpenJDK 1.8... done
remote: -----> Discovering process types
remote:        Procfile declares types -> web
remote:
remote: -----> Compressing... done, 50.3MB
remote: -----> Launching... done, v5
remote:        https://my-app.herokuapp.com/ deployed to Heroku
remote:
---> Done
```

If you are in an application directory, you can use the following command instead:

```sh-session
$ heroku deploy:war <path_to_war_file>
```

### 6. View your app on Heroku

Use the following command to open the application on the browser:

```sh-session
$ heroku open
```

You can learn how to customize the deploy (such as including files and setting Tomcat options)
in [Configuring WAR Deployment with the Heroku Toolbelt](https://devcenter.heroku.com/articles/configuring-war-deployment-with-the-heroku-toolbelt).

## Executable JAR Files

You can also use this tool to deploy executable JAR files. To do so, run a command like this:

```
$ heroku jar:deploy <path_to_jar> --app <appname>
```

Available options include:

```
 -j, --jar FILE         # jar or war to deploy
 -v, --jdk VERSION      # 7 or 8. defaults to 8
 -o, --options OPTS     # options passed to the jar file
 -i, --includes FILES   # list of files to include in the slug
```

The `--includes` option may contain a list of files separated by a `;` or `:` on Windows or Mac respectively. 

### Customizing your deployment

You can customize the command used to run your application by creating a `Procfile` in the *same directory* as your run the `heroku jar:deploy` command. For example:

```
web: java -cp my-uberjar.jar com.foo.MyMain opt1 opt2
```

You can view your current Procfile command by running `heroku ps`.

### Running locally

You can run your WAR file locally the way it is run on Heroku by executing
this command:

```
$ heroku war:run <path_to_war>
```

## Inspecting a JVM on Heroku

For information on using the `java` commands in this plugin, see the [Heroku Exec documentation](https://devcenter.heroku.com/articles/heroku-exec).

## Development

To run the tests:

```sh-session
$ bash bin/test
```

To update the `lib/heroku-deploy-complete.jar`:

```sh-session
$ bash bin/update <version>
```

For a list of versions see [Maven Central](http://repo1.maven.org/maven2/com/heroku/sdk/heroku-deploy-complete/).

To publish this plugin:

```sh-session
$ npm version <version>
$ npm publish
```

## License

MIT
