---
title: "Tomcat and CDI"
date: 2017-09-12
draft: false
tags: ["tomcat", "java", "cdi"]
summary: "Configure Tomcat together with the Weld CDI implementation from scratch, with a simple web application as a demonstration."
---

Running different technologies or products to work together can be sometimes challenging, especially for beginners.
Therefore, in the next article, we will show how to easily configure [Tomcat](http://tomcat.apache.org) along with
[Weld](http://weld.cdi-spec.org), the reference CDI implementation.

## Introduction

Before you start ensure Tomcat is successfully installed on your machine. The installation itself is not particularly difficult
and indeed very well documented and already covered by many tutorials and videos. I will use Tomcat 8.5.11 (for supported
versions of Tomcat, see the official Weld's [documentation](https://docs.jboss.org/weld/reference/latest/en-US/html/environments.html#_tomcat)).

## Maven

At the beginning, we will create a *blank* maven project. For this purpose, use the command:

```bash
$ mvn archetype:generate -DgroupId=com.hradecek.cdi -DartifactId=tomcat-cdi -DinteractiveMode=false
```

By editing the `pom.xml` file, we add [Apache Maven WAR Plugin](https://maven.apache.org/plugins/maven-war-plugin/):

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-war-plugin</artifactId>
      <version>3.1.0</version>
    </plugin>
  </plugins>
</build>
```

This plugin will ensure that maven will not complain about the missing `web.xml` descriptor in time of compilation.
Note that since version `3.0.0`, you do not have to explicitly set `failOnMissingWebXml` property,
whose default value has changed to `false` (see [documentation](https://maven.apache.org/plugins/maven-war-plugin/war-mojo.html#failOnMissingWebXml) for details).

*Update*: Moreover, starting with version `3.1.0`, the default value is set to `false` only if the project depends on the
Servlet 3.0 API or newer.

## Tomcat

Tomcat 8 has built-in support for Servlet API 3.1 (a.k.a. [https://jcp.org/en/jsr/detail?id=340](https://jcp.org/en/jsr/detail?id=340)),
which is part of Java EE 7 Web Profile, so we define it as a new dependency in our `pom.xml`:

```xml
<dependency>
  <groupId>javax</groupId>
  <artifactId>javaee-web-api</artifactId>
  <version>7.0</version>
  <scope>provided</scope>
</dependency>
```

The `<scope>provided</scope>` definition gives us the assurance that the libraries will **not** be included in the final
web archive, because we want to use server-side libraries already included in Tomcat.

## CDI

We use Weld for CDI support. Weld, as we already mentioned, is a reference implementation for CDI and has direct support for Tomcat.

Because we want to compile our project against the [CDI specification](http://cdi-spec.org), we need to add the CDI API dependency to the project:

```xml
<dependency>
  <groupId>javax.enterprise</groupId>
  <artifactId>cdi-api</artifactId>
  <version>2.0</version>
  <scope>provided</scope>
</dependency>
```

The dependency has `<scope>` defined as `provided`, because it will be used only at the time of the project compilation, just like the Servlet API above.
During runtime, Weld libraries will be used, which means that these libraries are not necessary for the compilation process itself, but for the application run:

```xml
<dependency>
  <groupId>org.jboss.weld.servlet</groupId>
  <artifactId>weld-servlet</artifactId>
  <version>2.4.5.Final</version>
  <scope>runtime</scope>
</dependency>
```

For CDI support, we must add the `beans.xml` file (even if empty) as the specification tells us.
In the `WEB-INF` folder, create a `beans.xml` file with the following content:

```xml
<beans xmlns="http://xmlns.jcp.org/xml/ns/javaee"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
                           http://xmlns.jcp.org/xml/ns/javaee/beans_2_0.xsd"
       version="2.0"
       bean-discovery-mode="all">
</beans>
```

Before CDI 2.0, we would have had to define an appropriate resource factory either via Tomcat's `META-INF/context.xml` file:

```xml
<Context>
  <Resource name="BeanManager"
            auth="Container"
            type="javax.enterprise.inject.spi.BeanManager"
            factory="org.jboss.weld.resources.ManagerObjectFactory"/>
</Context>
```

or the standard `WEB-INF/web.xml` file:

```xml
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
         http://xmlns.jcp.org/xml/ns/javaee/web-app_3_1.webxsd"
         version="3.1">
    <resource-env-ref>
        <resource-env-ref-name>BeanManager</resource-env-ref-name>
        <resource-env-ref-type>javax.enterprise.inject.spi.BeanManager</resource-env-ref-type>
    </resource-env-ref>
</web-app>
```

Now everything is set up and ready for use. When deploying the application, notice Tomcat also confirms (in log messages) that CDI is available for us:

```text
Tomcat 7+ detected, CDI injection will be available in Servlets, Filters and Listeners.
```

The fully working project is available at [github.com/hradecek/tomcat-cdi](https://github.com/hradecek/tomcat-cdi).

Enjoy!
