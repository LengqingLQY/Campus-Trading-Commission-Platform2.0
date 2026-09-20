package com.campus.errand;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 程序入口。
 *
 * 对比 Javatest 模板：那边没有 main 方法，war 包丢进 Tomcat 由 Tomcat 启动；
 * 这边 Spring Boot 内嵌了 Tomcat，直接 run 这个 main 就起服务。
 *
 * @SpringBootApplication 会自动扫描本类所在包及其子包，
 * 把 @RestController / @Service / @Repository 标注的类创建成对象并互相注入，
 * 所以 controller、service、dao 必须放在 com.campus.errand 下面。
 */
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
